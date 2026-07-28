import { createClient } from '@supabase/supabase-js';
import { toModifiedStartDateMs } from '../lib/markettime.js';

const BASE_URL = 'https://publicapi.markettime.com/mtpublic/api/v1';
const PAGE_SIZE = 250;

const requiredEnv = [
  'MT_API_KEY',
  'MT_REP_GROUP_ID',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const isFull = process.argv.includes('--full');
const modifiedStartDateArg = process.argv.find((arg) => arg.startsWith('--modifiedStartDate='));
const modifiedStartDate = modifiedStartDateArg?.split('=')[1];

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function mtFetch(path, options = {}, attempts = 4) {
  let lastError;
  const url = `${BASE_URL}/${process.env.MT_REP_GROUP_ID}${path}`;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'x-api-key': process.env.MT_API_KEY,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`MarketTime API error ${res.status}: ${text.slice(0, 300)}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(`MarketTime error: ${data.error?.message ?? 'Unknown error'}`);
      }

      return data.response;
    } catch (err) {
      lastError = err;
      if (attempt === attempts) break;

      const delay = 1000 * attempt;
      console.warn(`  Retry ${attempt}/${attempts - 1} for ${path}: ${err.message}`);
      await sleep(delay);
    }
  }

  throw lastError;
}

function mapManufacturer(m) {
  return {
    manufacturer_id: m.manufacturerID ?? m.recordID,
    name: m.name ?? m.manufacturerName ?? m.manufacturerID ?? String(m.recordID),
    logo_url: m.logoUrl ?? m.logoURL ?? null,
    raw: m,
    last_synced_at: new Date().toISOString(),
  };
}

function dedupeByKey(rows, key) {
  const byKey = new Map();
  for (const row of rows) {
    const id = row[key];
    if (id == null || id === '') continue;
    byKey.set(String(id), row);
  }
  return [...byKey.values()];
}

function mapProduct(item) {
  return {
    record_id: item.recordID,
    item_number: item.itemNumber,
    manufacturer_id: item.manufacturerID,
    manufacturer_name: item.manufacturerName,
    name: item.name,
    description: item.description,
    unit_price: item.unitPrice,
    retail_price: item.retailPrice,
    minimum_quantity: item.minimumQuantity ?? 1,
    quantity_increment: item.quantityIncrement ?? 1,
    case_quantity: item.caseQuantity ?? null,
    unit_qty: item.unitQty ?? null,
    primary_image_url: item.primaryImageUrl ?? null,
    additional_image_urls: item.additionalImageUrl ?? null,
    is_available: item.isAvailable ?? true,
    show_on_website: item.showOnWebsite ?? true,
    discontinued: item.discontinued ?? false,
    qty_available: item.qtyAvailable ?? null,
    discount_percent: item.discountPercent ?? null,
    scs_details: item.scsDetails ?? null,
    volume_pricing: item.volumePricing ?? null,
    rep_group_categories: item.repGroupCategories ?? null,
    manufacturer_category: item.manufacturerCategory ?? null,
    category_path: item.categoryPath ?? null,
    rep_group_category_path: item.repGroupCategoryPath ?? null,
    raw: item,
    last_synced_at: new Date().toISOString(),
  };
}

async function upsertManufacturerPlaceholders(products) {
  const placeholders = [
    ...new Map(
      products
        .filter((item) => item.manufacturer_id)
        .map((item) => [
          item.manufacturer_id,
          {
            manufacturer_id: item.manufacturer_id,
            name: item.manufacturer_name || item.manufacturer_id,
            raw: {
              source: 'products-sync-placeholder',
              manufacturerID: item.manufacturer_id,
              manufacturerName: item.manufacturer_name,
            },
            last_synced_at: new Date().toISOString(),
          },
        ])
    ).values(),
  ];

  if (placeholders.length === 0) return;

  const { error } = await db
    .from('manufacturers')
    .upsert(placeholders, { onConflict: 'manufacturer_id', ignoreDuplicates: true });

  if (error) {
    throw new Error(`Manufacturer placeholder upsert failed: ${error.message}`);
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  const logId = crypto.randomUUID();
  let itemsSynced = 0;
  let manufacturersSynced = 0;
  let syncError = null;

  console.log('Starting MarketTime sync...');
  console.log(`Mode: ${isFull ? 'full' : 'delta'}`);
  if (modifiedStartDate && !isFull) {
    console.log(`modifiedStartDate: ${modifiedStartDate}`);
  }

  await db.from('sync_log').insert({ id: logId, started_at: startedAt });

  try {
    console.log('Syncing manufacturers...');
    const manufacturerResponse = await mtFetch('/manufacturers');
    const manufacturers = Array.isArray(manufacturerResponse)
      ? manufacturerResponse
      : manufacturerResponse?.records ?? [];

    if (manufacturers.length) {
      const mfrRows = dedupeByKey(manufacturers.map(mapManufacturer), 'manufacturer_id');
      const { error } = await db
        .from('manufacturers')
        .upsert(mfrRows, { onConflict: 'manufacturer_id' });

      if (error) throw new Error(`Manufacturer upsert failed: ${error.message}`);
      manufacturersSynced = manufacturers.length;
    }

    console.log(`Manufacturers synced: ${manufacturersSynced}`);

    let offset = 0;
    while (true) {
      const params = new URLSearchParams({
        offset: String(offset),
        recordSize: String(PAGE_SIZE),
      });

      if (modifiedStartDate && !isFull) {
        params.set('modifiedStartDate', String(toModifiedStartDateMs(modifiedStartDate)));
      }

      const response = await mtFetch(`/items?${params}`);
      const records = Array.isArray(response) ? response : response?.records ?? [];

      if (records.length === 0) {
        console.log('No more product records returned. Sync complete.');
        break;
      }

      // Upsert ALL records returned by MarketTime, including discontinued and
      // hidden ones. The previous version filtered these out before the upsert,
      // which meant items that flipped from active -> discontinued kept their
      // stale `discontinued = false` row forever and stayed visible in the
      // catalog. The customer-facing /api/catalog query already filters on
      // show_on_website and discontinued, so storing them is safe.
      const products = dedupeByKey(records.map(mapProduct), 'record_id');

      if (products.length) {
        await upsertManufacturerPlaceholders(products);

        const { error } = await db
          .from('products')
          .upsert(products, { onConflict: 'record_id' });

        if (error) throw new Error(`Product upsert failed: ${error.message}`);
        itemsSynced += products.length;
      }

      console.log(
        `Offset ${offset.toString().padStart(6, ' ')} | ` +
        `fetched ${records.length.toString().padStart(3, ' ')} | ` +
        `upserted ${products.length.toString().padStart(3, ' ')} | ` +
        `total ${itemsSynced}`
      );

      if (records.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  } catch (err) {
    syncError = err.message;
    console.error('Sync failed:', err);
  } finally {
    const finishedAt = new Date().toISOString();
    await db
      .from('sync_log')
      .update({
        finished_at: finishedAt,
        items_synced: itemsSynced,
        manufacturers_synced: manufacturersSynced,
        error: syncError,
      })
      .eq('id', logId);

    console.log('\nSync summary:');
    console.log(JSON.stringify({
      success: !syncError,
      itemsSynced,
      manufacturersSynced,
      startedAt,
      finishedAt,
      error: syncError,
    }, null, 2));
  }

  if (syncError) process.exit(1);
}

main();
