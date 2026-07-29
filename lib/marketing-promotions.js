import { brands, catalogProductsHref } from './marketing-data.js';
import { getActiveManufacturers } from './active-manufacturers.js';
import { normalizePromotionsForManufacturer, parsePromotionDate } from './manufacturer-checkout.js';
import { getManufacturerPromotions } from './markettime.js';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPromoDateRange(startDate, endDate) {
  const start = parsePromotionDate(startDate);
  const end = parsePromotionDate(endDate, { endOfDay: true });
  const fmt = (d) =>
    d
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (end) return `Through ${fmt(end)}`;
  if (start) return `Starts ${fmt(start)}`;
  return 'Ongoing';
}

function deriveDiscountLabel(promo) {
  const text = `${promo.title ?? ''} ${promo.description ?? ''} ${promo.shippingMethod ?? ''}`;
  if (promo.discountPercent > 0) return `${promo.discountPercent}% off`;
  if (promo.amountToMeet > 0 && /freight|ffa|shipping/i.test(text)) return 'Free Freight';
  if (promo.amountToMeet > 0) return 'Spend & Save';
  return 'Special Offer';
}

function deriveSpendLabel(promo) {
  if (promo.amountToMeet > 0) return `${formatCurrency(promo.amountToMeet)}+`;
  return 'any order';
}

function deriveBadge(promo) {
  const text = `${promo.title ?? ''} ${promo.description ?? ''}`;
  if (/new customer|first order/i.test(text)) return 'New Customers';
  if (/limited/i.test(text)) return 'Limited Time';
  if (/april|may|spring|season/i.test(text)) return 'Seasonal';
  if (/new item/i.test(text)) return 'New Items';
  return '';
}

function resolveMarketingBrand(manufacturer) {
  const norm = (manufacturer?.name ?? '').toLowerCase();
  const brand = brands.find((b) => {
    const bn = b.name.toLowerCase();
    return bn === norm || norm.includes(bn) || bn.includes(norm);
  });
  return brand ?? null;
}

export function promotionToDealCard(promo, manufacturer) {
  const marketingBrand = resolveMarketingBrand(manufacturer);
  const brandName = marketingBrand?.name ?? manufacturer?.name ?? 'Manufacturer';
  const brandSlug = marketingBrand?.id ?? null;

  return {
    recordID: promo.recordID,
    title: promo.title,
    description: promo.description ?? '',
    brand: brandName,
    brandLogo: manufacturer?.logo_url || marketingBrand?.logo || '',
    brandSlug,
    catalogHref: brandSlug ? catalogProductsHref(brandSlug) : '/catalog',
    dates: formatPromoDateRange(promo.startDate, promo.endDate),
    discount: deriveDiscountLabel(promo),
    spend: deriveSpendLabel(promo),
    badge: deriveBadge(promo),
  };
}

/** Load currently active MarketTime promotions for all portal manufacturers. */
export async function fetchActiveMarketingPromotions(db) {
  const manufacturers = await getActiveManufacturers(db);

  const results = await Promise.allSettled(
    manufacturers.map(async (mfr) => {
      const response = await getManufacturerPromotions(mfr.manufacturer_id);
      const promotions = normalizePromotionsForManufacturer(response, mfr.manufacturer_id);
      return promotions.map((promo) => promotionToDealCard(promo, mfr));
    })
  );

  const deals = [];
  const seen = new Set();

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const deal of result.value) {
      const key = deal.recordID ?? `${deal.brand}::${deal.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deals.push(deal);
    }
  }

  return deals.sort((a, b) => a.brand.localeCompare(b.brand) || a.title.localeCompare(b.title));
}
