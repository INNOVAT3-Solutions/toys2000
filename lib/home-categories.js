/**
 * Toys2000 sales-channel categories (Resort, Pool, etc.) are not stored on MT
 * product rows. Map each home-page category to manufacturer name keywords.
 */

import { filterActiveManufacturers } from '@/lib/active-manufacturers';

export const HOME_CATEGORIES = [
  {
    id: 'resort-destination',
    name: 'Resort & Destination',
    image: '/brands/aqua_leisure/aqua_leisure_hero_3.png',
    description: 'Pool decks, waterparks, and resort attractions',
    keywords: [
      'aqua', 'airhead', 'water sport', 'boss play', 'swim', 'leisure', 'float',
      'splash', 'caribbean', 'diver', 'marine', 'beach', 'towable', 'pool',
    ],
  },
  {
    id: 'pool',
    name: 'Pool',
    image: '/categories/pool_kid_face.png',
    description: 'Floats, toys, and gear for pool environments',
    keywords: [
      'aqua', 'airhead', 'water sport', 'boss play', 'swim', 'leisure', 'float',
      'pool', 'splash', 'inflatable', 'ring', 'noodle',
    ],
  },
  {
    id: 'sporting-goods',
    name: 'Sporting Goods',
    image: '/brands/SAT1_sport/sat1_sport_hero_4.png',
    description: 'Sports equipment and active play',
    keywords: ['sport', 'athletic', 'ball', 'soccer', 'sat1', 'fitness', 'outdoor game'],
  },
  {
    id: 'hardware',
    name: 'Hardware',
    image: '/categories/hardware_toy_set.png',
    description: 'Construction and tool sets for young builders',
    keywords: ['brictek', 'brick', 'construction', 'tool', 'build', 'hardware', 'workbench', 'brix'],
  },
  {
    id: 'private-store',
    name: 'Private Store',
    image: '/categories/private_store_boutique.png',
    description: 'Curated collections for boutiques and gift shops',
    keywords: [
      'plush', 'gift', 'boutique', 'jewel', 'novelty', 'souvenir', 'ovvel', 'rico',
      'trophy', 'music', 'instrument', 'ukulele',
    ],
  },
  {
    id: 'strictly-toy',
    name: 'Strictly Toy',
    image: '/brands/lionel/lionel_hero_1.png',
    description: 'Classic toys, trains, and collectibles',
    keywords: [
      'lionel', 'train', 'puzzle', 'masterpiece', 'game', 'toy', 'playsteam', 'beginagain',
      '3d toy', 'doll', 'figur', 'collect',
    ],
  },
  {
    id: 'zag',
    name: 'Zoos, Aquariums & Gardens',
    image: '/categories/zag.png',
    description: 'Educational toys and nature-inspired gifts',
    keywords: [
      'zoo', 'aquarium', 'garden', 'nature', 'science', 'educat', 'animal', 'dino',
      'safari', 'wildlife', 'eco', 'stem', 'headu',
    ],
  },
  {
    id: 'supermarket',
    name: 'Supermarket',
    image: '/brands/masterpieces/masterpieces_hero_3.png',
    description: 'High-volume products for retail chains',
    keywords: [
      'masterpiece', 'puzzle', 'candy', 'gummy', 'bulk', 'airhead', 'water sport',
      'seasonal', 'value', 'mass',
    ],
  },
];

export function getHomeCategory(slug) {
  if (!slug) return null;
  return HOME_CATEGORIES.find((c) => c.id === slug) ?? null;
}

/** Match manufacturer rows whose names fit a home category's keywords. */
export function matchManufacturersForCategory(manufacturers, categorySlug) {
  const category = getHomeCategory(categorySlug);
  if (!category) return [];

  const keywords = category.keywords.map((k) => k.toLowerCase());

  return (manufacturers ?? []).filter((mfr) => {
    const name = (mfr.name ?? '').toLowerCase();
    return keywords.some((kw) => name.includes(kw));
  });
}

export function getCategoryManufacturerIds(manufacturers, categorySlug) {
  return matchManufacturersForCategory(manufacturers, categorySlug).map(
    (m) => m.manufacturer_id
  );
}

/**
 * Apply a home-page category slug to a Supabase products query.
 * Returns { query, categoryMeta, manufacturerIds }.
 */
export async function applyHomeCategoryFilter(db, query, categorySlug) {
  const category = getHomeCategory(categorySlug);
  if (!category) {
    return { query: query.eq('manufacturer_id', '__none__'), categoryMeta: null, manufacturerIds: [] };
  }

  const { data: manufacturers } = await db.from('manufacturers').select('manufacturer_id, name');
  const activeManufacturers = filterActiveManufacturers(manufacturers);
  const manufacturerIds = getCategoryManufacturerIds(activeManufacturers, categorySlug);

  if (manufacturerIds.length === 0) {
    return { query: query.eq('manufacturer_id', '__none__'), categoryMeta: category, manufacturerIds: [] };
  }

  return {
    query: query.in('manufacturer_id', manufacturerIds),
    categoryMeta: category,
    manufacturerIds,
  };
}
