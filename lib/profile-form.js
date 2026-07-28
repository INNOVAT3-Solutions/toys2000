const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
]);

export const PROFILE_INPUT_CLASS =
  'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#f15a24]';

export function normalizeCountry(value) {
  const country = String(value ?? '').trim().toUpperCase();
  if (!country) return '';
  if (country === 'USA' || country === 'UNITED STATES' || country === 'U S A') return 'US';
  if (country === 'CANADA') return 'CA';
  return country;
}

export function cleanField(value) {
  return String(value ?? '').trim();
}

export function validateCustomerFields(fields) {
  const problems = [];
  if (!cleanField(fields.name)) problems.push('Company name is required');
  if (!cleanField(fields.email)) problems.push('Email is required');
  if (!cleanField(fields.state)) problems.push('State is required');
  if (!cleanField(fields.country)) problems.push('Country is required');
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    problems.push('Email format is invalid');
  }
  const state = cleanField(fields.state).toUpperCase();
  const country = normalizeCountry(fields.country);
  if (country === 'US' && state && !US_STATE_CODES.has(state)) {
    problems.push('Use a two-letter US state code (e.g. FL)');
  }
  return problems;
}

export function validateShipToFields(fields) {
  const problems = validateCustomerFields({ ...fields, name: fields.name });
  if (!cleanField(fields.address1)) problems.push('Street address is required');
  if (!cleanField(fields.city)) problems.push('City is required');
  if (!cleanField(fields.zip)) problems.push('ZIP code is required');
  return problems;
}

export function validateContactFields(fields) {
  const problems = [];
  if (!cleanField(fields.firstName)) problems.push('First name is required');
  if (!cleanField(fields.email)) problems.push('Email is required');
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    problems.push('Email format is invalid');
  }
  return problems;
}

export function buildCustomerUpdatePayload(fields) {
  return {
    name: cleanField(fields.name),
    email: cleanField(fields.email),
    phone: cleanField(fields.phone),
    website: cleanField(fields.website) || null,
    address1: cleanField(fields.address1) || null,
    address2: cleanField(fields.address2) || null,
    city: cleanField(fields.city) || null,
    state: cleanField(fields.state).toUpperCase(),
    zip: cleanField(fields.zip) || null,
    country: normalizeCountry(fields.country),
  };
}

export function buildShipToUpdatePayload(fields, { isPrimary = false } = {}) {
  return {
    name: cleanField(fields.name),
    email: cleanField(fields.email),
    phone: cleanField(fields.phone),
    address1: cleanField(fields.address1),
    address2: cleanField(fields.address2) || '',
    city: cleanField(fields.city),
    state: cleanField(fields.state).toUpperCase(),
    zip: cleanField(fields.zip),
    country: normalizeCountry(fields.country),
    active: true,
    isPrimary,
  };
}

export function buildContactUpdatePayload(fields, { isPrimary = false } = {}) {
  return {
    firstName: cleanField(fields.firstName),
    lastName: cleanField(fields.lastName) || '',
    title: cleanField(fields.title) || null,
    email: cleanField(fields.email),
    phone: cleanField(fields.phone) || '',
    isPrimary,
  };
}
