/**
 * Toys2000 active manufacturer allowlist.
 * Source: manufacturers.csv — only these brands are shown in the portal.
 */
export const ACTIVE_MANUFACTURERS = [
  { name: 'Airhead', abbreviation: 'ARHD', patterns: ['airhead'] },
  { name: 'Aqua Divers', abbreviation: 'AQAD', patterns: ['aqua diver', 'aqua leisure'] },
  { name: 'Boss Play Inc', abbreviation: 'BPIK', patterns: ['boss play'] },
  { name: 'Caribbean Waterworks', abbreviation: 'CARI', patterns: ['caribbean'] },
  { name: 'dba Edgewood Puzzle', abbreviation: 'EDGE', patterns: ['edgewood'] },
  { name: 'FREDS SWIM ACADEMY USA Inc', abbreviation: 'FSAU', patterns: ['fred', 'swim academy', 'swimtrainer'] },
  { name: 'Lionel, LLC', abbreviation: 'LION', patterns: ['lionel'] },
  { name: 'Masterpieces Puzzle Company', abbreviation: 'MAST', patterns: ['masterpiece'] },
  { name: 'OVVEL INC.', abbreviation: 'OVVL', patterns: ['ovvel'] },
  { name: 'Premier Investments', abbreviation: 'PREM', patterns: ['premier'] },
  { name: 'Rico Italia USA', abbreviation: 'RICO', patterns: ['rico italia', 'rico'] },
  { name: 'Sat 1 Sport', abbreviation: 'SAT1', patterns: ['sat 1', 'sat1'] },
  { name: 'Silver Circle Products', abbreviation: 'SILC', patterns: ['silver circle'] },
  { name: 'The 3D Toy Store', abbreviation: '3DTS', patterns: ['3d toy'] },
  { name: 'Uzzi', abbreviation: 'UZZI', patterns: ['uzzi'] },
  { name: 'Water Sports, LLC', abbreviation: 'WATE', patterns: ['water sport'] },
];

/** Optional local logo overrides when MT has no logo_url. */
export const HOME_BRAND_LOGOS = {
  airhead: '/logos/Airhead-Primary-Logo-website.png',
  'aqua diver': '/logos/aqua_leisure.png',
  'boss play': '/logos/boss_play.png',
  lionel: '/logos/lionel.png',
  masterpiece: '/logos/masterpieces-logo.png',
  ovvel: '/logos/ovvel.png',
  'rico italia': '/logos/rico_italia.png',
  'water sport': '/logos/water_sports.png',
  '3d toy': '/logos/3d_toy_store.png',
};

function normalizeManufacturerName(name) {
  return (name ?? '')
    .toLowerCase()
    .replace(/^dba\s+/i, '')
    .replace(/[.,']/g, ' ')
    .replace(/\b(inc|llc|usa|corp|company|co)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesActiveManufacturer(name) {
  const norm = normalizeManufacturerName(name);
  if (!norm) return false;

  return ACTIVE_MANUFACTURERS.some((active) => {
    const activeNorm = normalizeManufacturerName(active.name);
    if (norm === activeNorm || norm.includes(activeNorm) || activeNorm.includes(norm)) {
      return true;
    }
    return (active.patterns ?? []).some((pattern) => norm.includes(pattern.toLowerCase()));
  });
}

export function filterActiveManufacturers(manufacturers) {
  return (manufacturers ?? []).filter((mfr) => matchesActiveManufacturer(mfr.name));
}

export function isActiveManufacturerId(manufacturerId, activeManufacturers) {
  return (activeManufacturers ?? []).some((mfr) => mfr.manufacturer_id === manufacturerId);
}

export function applyActiveProductFilter(query, activeIds) {
  if (!activeIds?.length) {
    return query.eq('manufacturer_id', '__none__');
  }
  return query.in('manufacturer_id', activeIds);
}

/**
 * Load manufacturers from Supabase and return only the active allowlist.
 */
export async function getActiveManufacturers(db) {
  const { data, error } = await db
    .from('manufacturers')
    .select('manufacturer_id, name, logo_url')
    .order('name');

  if (error) throw error;
  return filterActiveManufacturers(data);
}

export async function getActiveManufacturerIds(db) {
  const active = await getActiveManufacturers(db);
  return active.map((mfr) => mfr.manufacturer_id);
}

export function resolveBrandLogo(name) {
  const norm = normalizeManufacturerName(name);
  for (const [key, logo] of Object.entries(HOME_BRAND_LOGOS)) {
    if (norm.includes(key)) return logo;
  }
  return null;
}

export function findActiveManufacturerByBrandParam(manufacturers, brandParam) {
  const decoded = decodeURIComponent(brandParam ?? '').trim();
  if (!decoded) return null;

  const lower = decoded.toLowerCase();
  return (manufacturers ?? []).find((mfr) => {
    const name = (mfr.name ?? '').toLowerCase();
    return name === lower || name.includes(lower) || lower.includes(name);
  }) ?? null;
}
