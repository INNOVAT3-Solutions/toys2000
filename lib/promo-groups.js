import { promos } from './marketing-data.js';

function groupDeals(allDeals) {
  const groups = [
    {
      id: 'spring',
      label: 'Spring Specials',
      icon: 'spring',
      deals: allDeals.filter((d) => /april|may|spring|season/i.test(`${d.title} ${d.dates} ${d.badge}`)),
    },
    {
      id: 'new-customer',
      label: 'New Customers',
      icon: 'new-customer',
      deals: allDeals.filter((d) =>
        /new customer|first order/i.test(`${d.title} ${d.description} ${d.badge}`)
      ),
    },
    {
      id: 'shipping',
      label: 'Free Freight',
      icon: 'shipping',
      deals: allDeals.filter(
        (d) =>
          /free freight|ffa|free shipping/i.test(`${d.title} ${d.discount} ${d.description}`) &&
          !/new customer|first order/i.test(`${d.title} ${d.badge}`)
      ),
    },
    {
      id: 'volume',
      label: 'Volume Discounts',
      icon: 'volume',
      deals: allDeals.filter(
        (d) =>
          /% off|volume|tier|spend & save/i.test(`${d.title} ${d.description} ${d.discount}`) &&
          !/april|new customer|first order/i.test(`${d.title} ${d.badge}`)
      ),
    },
  ];

  const seen = new Set();
  const cleanGroups = groups
    .map((g) => ({
      ...g,
      deals: g.deals.filter((d) => {
        const key = d.recordID ?? `${d.title}::${d.brand}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    }))
    .filter((g) => g.deals.length > 0);

  const allKeys = new Set(
    cleanGroups.flatMap((g) => g.deals.map((d) => d.recordID ?? `${d.title}::${d.brand}`))
  );
  const uncategorized = allDeals.filter((d) => !allKeys.has(d.recordID ?? `${d.title}::${d.brand}`));
  if (uncategorized.length) {
    cleanGroups.push({
      id: 'other',
      label: 'Other Offers',
      icon: 'other',
      deals: uncategorized,
    });
  }

  return cleanGroups;
}

/** Group live MarketTime promo cards for the marketing home page. */
export function buildPromoGroupsFromDeals(allDeals) {
  return groupDeals(allDeals ?? []);
}

/** Static promos from marketing-data (legacy). */
export function buildPromoGroups() {
  const allDeals = promos.flatMap((promo) =>
    promo.deals.map((deal) => ({
      ...deal,
      brand: promo.brand,
      brandLogo: promo.logo,
      catalogHref: '/catalog',
    }))
  );
  return groupDeals(allDeals);
}
