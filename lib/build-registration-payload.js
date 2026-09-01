/**
 * Build a MarketTime POST /customers payload from the public registration form.
 */

import { WEB_REGISTRATION_EXTERNAL_ID } from '@/lib/find-markettime-customer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value) {
  if (value == null) return '';
  return String(value).trim();
}

function normalizePhone(phone) {
  return clean(phone)
    .replace(/\s*(ext|x)\b.*$/i, '')
    .replace(/[^\d+().\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

function normalizeZip(zip, country) {
  const cleaned = clean(zip);
  if (!cleaned) return '';
  if (country === 'US') {
    const match = cleaned.match(/\d{5}/);
    return match ? match[0] : cleaned.replace(/[^\d-]/g, '').slice(0, 10);
  }
  return cleaned.slice(0, 16);
}

function normalizeCountry(value) {
  const country = clean(value).toUpperCase();
  if (!country || country === 'USA' || country === 'UNITED STATES' || country === 'U S A') {
    return 'US';
  }
  if (country === 'CANADA') return 'CA';
  return country.length <= 4 ? country : country.slice(0, 4);
}

function normalizeWebsite(value) {
  const website = clean(value);
  if (!website) return null;
  if (/^https?:\/\//i.test(website)) return website;
  return `https://${website}`;
}

/**
 * Validate + normalize registration form input.
 * @returns {{ ok: true, data: object } | { ok: false, errors: string[] }}
 */
export function parseRegistrationInput(body = {}) {
  const errors = [];

  const companyName = clean(body.companyName);
  const email = clean(body.email).toLowerCase();
  const phone = normalizePhone(body.phone);
  const address1 = clean(body.address1);
  const address2 = clean(body.address2) || null;
  const city = clean(body.city);
  const state = clean(body.state).toUpperCase();
  const country = normalizeCountry(body.country);
  const zip = normalizeZip(body.zip, country);
  const website = normalizeWebsite(body.website);
  const fax = normalizePhone(body.fax);
  const taxId = clean(body.taxId);
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);

  if (!companyName) errors.push('Company name is required');
  if (!email || !EMAIL_RE.test(email)) errors.push('A valid company email is required');
  if (!phone) errors.push('Phone is required');
  if (!address1) errors.push('Address is required');
  if (!city) errors.push('City is required');
  if (!state) errors.push('State is required');
  if (!zip) errors.push('Zip code is required');
  if (!firstName) errors.push('Contact first name is required');
  if (!lastName) errors.push('Contact last name is required');

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      companyName,
      email,
      phone,
      address1,
      address2,
      city,
      state,
      country,
      zip,
      website,
      fax: fax || null,
      taxId: taxId || null,
      firstName,
      lastName,
    },
  };
}

/**
 * MarketTime customer create payload (unapproved — Jimmy must approve in admin).
 */
export function buildRegistrationCustomerPayload(data) {
  const notes = data.taxId
    ? `Resale / Federal Tax #: ${data.taxId}`
    : null;

  return {
    name: data.companyName,
    externalID: WEB_REGISTRATION_EXTERNAL_ID,
    phone: data.phone,
    email: data.email,
    website: data.website,
    address1: data.address1,
    address2: data.address2,
    city: data.city,
    state: data.state,
    zip: data.zip,
    country: data.country,
    active: true,
    approved: false,
    companyLogo: false,
    contacts: [
      {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        isPrimary: true,
        ...(notes ? { notes } : {}),
        ...(data.fax ? { fax: data.fax } : {}),
      },
    ],
    shipToLocations: [
      {
        name: data.companyName,
        email: data.email,
        phone: data.phone,
        address1: data.address1,
        address2: data.address2 || '',
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        isPrimary: true,
        active: true,
      },
    ],
  };
}
