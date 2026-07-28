import { createAdminClient } from '@/lib/supabase-server';
import { getItems, getManufacturers } from '@/lib/markettime';
import { NextResponse } from 'next/server';

const PAGE_SIZE = 250;

function dedupeByKey(rows, key, label) {
  const byKey = new Map();

  for (const row of rows) {
    const id = row[key];
    if (id == null || id === '') continue;
    byKey.set(String(id), row);
  }

  const deduped = [...byKey.values()];
  if (deduped.length < rows.length) {
    console.warn(
      `[Sync] Deduped ${rows.length - deduped.length} duplicate ${label} row(s) in batch`
    );
  }

  return deduped;
}

async function withRetry(label, fn, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === attempts) break;
      const delayMs = 750 * attempt;
      console.warn(`[Sync] ${label} failed (attempt ${attempt}/${attempts}); retrying in ${delayMs}ms`, err);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

/**
 * Sync manufacturers + products from MarketTime into Supabase.
 * @param {{ modifiedStartDate?: string | null, isFull?: boolean }} options
 */
export async function runCatalogSync({ modifiedStartDate, isFull = false }) {
  const db = createAdminClient();

  const startedAt = new Date().toISOString();

  const logId = crypto.randomUUID();
  try {
    await db
      .from('sync_log')
      .insert({ id: logId, started_at: startedAt });
  } catch {
    // Non-fatal — sync proceeds even if we can't log the start
  }

  let itemsSynced = 0;
  let manufacturersSynced = 0;
  let syncError = null;

  try {
    const mfrsResponse = await withRetry('GET /manufacturers', () => getManufacturers());
    const manufacturers = Array.isArray(mfrsResponse) ? mfrsResponse : mfrsResponse?.records ?? [];

    if (manufacturers.length > 0) {
      const mfrRows = manufacturers.map((m) => ({
        manufacturer_id: m.manufacturerID ?? m.recordID,
        name: m.name ?? m.manufacturerName,
        logo_url: m.logoUrl ?? m.logoURL ?? null,
        minimum_order_amount: m.minimumOrderAmount ?? null,
        minimum_reorder_amount: m.minimumReorderAmount ?? null,
        raw: m,
        last_synced_at: new Date().toISOString(),
      }));

      const uniqueMfrRows = dedupeByKey(mfrRows, 'manufacturer_id', 'manufacturer');

      const { error: mfrError } = await db
        .from('manufacturers')
        .upsert(uniqueMfrRows, { onConflict: 'manufacturer_id' });

      if (mfrError) throw new Error(`Manufacturer upsert failed: ${mfrError.message}`);
      manufacturersSynced = uniqueMfrRows.length;
    }

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const params = { offset, recordSize: PAGE_SIZE };
      if (modifiedStartDate && !isFull) {
        params.modifiedStartDate = modifiedStartDate;
      }

      const response = await withRetry(
        `GET /items offset=${offset}`,
        () => getItems(params),
        4
      );
      const records = Array.isArray(response) ? response : response?.records ?? [];

      if (records.length === 0) {
        hasMore = false;
        break;
      }

      const productRows = records
        .map((item) => ({
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
        }));

      if (productRows.length > 0) {
        const manufacturerPlaceholders = [
          ...new Map(
            productRows
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

        if (manufacturerPlaceholders.length > 0) {
          const { error: placeholderError } = await db
            .from('manufacturers')
            .upsert(manufacturerPlaceholders, { onConflict: 'manufacturer_id', ignoreDuplicates: true });

          if (placeholderError) {
            throw new Error(`Manufacturer placeholder upsert failed: ${placeholderError.message}`);
          }
        }

        const uniqueProductRows = dedupeByKey(productRows, 'record_id', 'product');

        const { error: productError } = await db
          .from('products')
          .upsert(uniqueProductRows, { onConflict: 'record_id' });

        if (productError) throw new Error(`Product upsert failed: ${productError.message}`);
        itemsSynced += uniqueProductRows.length;
      }

      if (records.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        offset += PAGE_SIZE;
      }
    }
  } catch (err) {
    syncError = err.message;
    console.error('[Sync] Error:', err);
  }

  const finishedAt = new Date().toISOString();
  await db.from('sync_log').update({
    finished_at: finishedAt,
    items_synced: itemsSynced,
    manufacturers_synced: manufacturersSynced,
    error: syncError,
  }).eq('id', logId);

  const success = !syncError;
  return NextResponse.json(
    {
      success,
      itemsSynced,
      manufacturersSynced,
      startedAt,
      finishedAt,
      error: syncError,
    },
    { status: success ? 200 : 500 }
  );
}
