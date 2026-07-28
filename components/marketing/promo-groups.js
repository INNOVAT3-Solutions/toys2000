import { brands, promos } from '@/lib/marketing-data';

const SPRING_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12l2 2 4-4" />
  </svg>
);

const NEW_CUSTOMER_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const SHIPPING_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const VOLUME_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const OTHER_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export function buildPromoGroups() {
  const allDeals = promos.flatMap((promo) => {
    const brand = brands.find((b) => b.id === promo.brandId);
    const brandLogo = promo.logo || (brand ? brand.logo : '');
    return promo.deals.map((deal) => ({
      ...deal,
      brand: promo.brand,
      brandLogo,
      image: promo.image,
    }));
  });

  const groups = [
    {
      id: 'spring',
      label: 'Spring Specials',
      icon: SPRING_ICON,
      deals: allDeals.filter((d) => /april|may|spring|season/i.test(d.title + d.dates)),
    },
    {
      id: 'new-customer',
      label: 'New Customers',
      icon: NEW_CUSTOMER_ICON,
      deals: allDeals.filter((d) =>
        /new customer|first order/i.test(d.title + d.description + d.badge)
      ),
    },
    {
      id: 'shipping',
      label: 'Free Freight',
      icon: SHIPPING_ICON,
      deals: allDeals.filter(
        (d) =>
          /free freight|FFA|free shipping/i.test(d.title + d.discount + d.description) &&
          !/new customer|first order/i.test(d.title + d.badge)
      ),
    },
    {
      id: 'volume',
      label: 'Volume Discounts',
      icon: VOLUME_ICON,
      deals: allDeals.filter(
        (d) =>
          /special at|volume|tier|% off/i.test(d.title + d.description) &&
          !/april|new customer|first order/i.test(d.title + d.badge)
      ),
    },
  ];

  const seen = new Set();
  const cleanGroups = groups
    .map((g) => ({
      ...g,
      deals: g.deals.filter((d) => {
        const key = d.title + d.brand;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    }))
    .filter((g) => g.deals.length > 0);

  const allKeys = new Set(cleanGroups.flatMap((g) => g.deals.map((d) => d.title + d.brand)));
  const uncategorized = allDeals.filter((d) => !allKeys.has(d.title + d.brand));
  if (uncategorized.length) {
    cleanGroups.push({
      id: 'other',
      label: 'Other Offers',
      icon: OTHER_ICON,
      deals: uncategorized,
    });
  }

  return cleanGroups;
}
