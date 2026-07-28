/**
 * MarketTime bulk customer upload — ported from markettime_customer_upload.py
 * POST /customers (one row at a time; no bulk endpoint).
 *
 * Excel columns can appear in any order. Headers are matched flexibly (case/spacing).
 * Only name, email, state, and country are required per row.
 */

import * as XLSX from 'xlsx';

/** Required logical fields — must be present on each row. */
export const REQUIRED_CUSTOMER_FIELDS = ['company_name', 'email', 'state', 'country'];

/**
 * Recognized column aliases (normalized before match).
 * First alias is the preferred display label in the UI.
 */
export const CUSTOMER_FIELD_ALIASES = {
  // Company / customer name — not the contact-person "NAME" column in US Divers exports
  company_name: [
    'cstnam', 'company name', 'customer name', 'company', 'business name',
    'account name', 'cust name', 'alpcd',
  ],
  email: ['email', 'e-mail', 'email address', 'contact email'],
  state: ['state', 'st', 'province', 'region'],
  country: ['country', 'nation', 'country code'],
  contact_name: ['name', 'contact name', 'contact', 'rep name', 'buyer name'],
  address1: [
    'address 1', 'address', 'street', 'street address', 'address line 1', 'adr1',
    'shipto address', 'ship to address', 'ship to addr',
  ],
  address2: [
    'address 2', 'address line 2', 'suite', 'unit', 'adr2',
    'shipto name', 'ship to name',
  ],
  city: ['city', 'town'],
  adr4: ['adr4', 'city line', 'city state zip'],
  zip: ['zip', 'zip code', 'postal', 'postal code', 'postcode', 'zipcd'],
  phone: ['phone', 'telephone', 'phone number', 'contact phone', 'phn'],
  first_name: ['contact first name', 'first name', 'firstname', 'contact first'],
  last_name: ['contact last name', 'last name', 'lastname', 'contact last'],
  external_id: ['customer number', 'external id', 'account number', 'customer id', 'cstno', 'cust no'],
  website: ['website', 'web', 'url', 'web site'],
};

/** MarketTime POST /customers also requires ship-to + billing address fields. */
export const MARKETTIME_IMPORT_FIELDS = ['city', 'address1', 'zip', 'phone'];
export const MAX_UPLOAD_ROWS = 5000;
export const IMPORT_BATCH_SIZE = 5;
export const RATE_LIMIT_MS = 500;
export const MAX_RETRIES = 4;
export const DEFAULT_COUNTRY = 'US';

function clean(value) {
  if (value == null) return '';
  const s = String(value).trim();
  return s.toLowerCase() === 'nan' ? '' : s;
}

function normalizeHeader(header) {
  return String(header ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Map logical fields to actual Excel column headers (any order).
 * Each spreadsheet column is used at most once; required fields are matched first.
 */
export function buildHeaderMap(headers) {
  const normalized = (headers ?? []).map((header) => ({
    original: header,
    norm: normalizeHeader(header),
  }));

  const headerMap = {};
  const used = new Set();

  const fieldOrder = [
    ...REQUIRED_CUSTOMER_FIELDS,
    'contact_name',
    ...Object.keys(CUSTOMER_FIELD_ALIASES).filter(
      (f) => !REQUIRED_CUSTOMER_FIELDS.includes(f) && f !== 'contact_name'
    ),
  ];

  for (const field of fieldOrder) {
    const aliases = CUSTOMER_FIELD_ALIASES[field] ?? [];
    const aliasNorms = aliases.map(normalizeHeader);

    const match = normalized.find(
      ({ original, norm }) => !used.has(original) && aliasNorms.includes(norm)
    );

    if (match) {
      headerMap[field] = match.original;
      used.add(match.original);
    }
  }

  return headerMap;
}

export function getMissingRequiredColumns(headerMap) {
  return REQUIRED_CUSTOMER_FIELDS.filter((field) => {
    if (field === 'country' && !headerMap.country) {
      return false;
    }
    return !headerMap[field];
  });
}

function normalizeCountry(value) {
  const country = clean(value).toUpperCase();
  if (!country) return '';
  if (country === 'USA' || country === 'UNITED STATES' || country === 'U S A') {
    return 'US';
  }
  if (country === 'CANADA') return 'CA';
  return country.length <= 4 ? country : country.slice(0, 4);
}

function getCountry(row, headerMap) {
  const country = normalizeCountry(getField(row, headerMap, 'country'));
  if (country) return country;
  if (!headerMap.country && getField(row, headerMap, 'state')) {
    return DEFAULT_COUNTRY;
  }
  return '';
}

function cleanCompanyName(value) {
  return clean(value).replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
}

/** US Divers ADR4 format: "AUGUSTA, GA  30907" */
function parseCityFromAdr4(adr4) {
  if (!adr4) return '';
  return adr4.split(',')[0]?.trim() ?? '';
}

function splitContactName(fullName) {
  const raw = clean(fullName);
  if (!raw) return { firstName: '', lastName: '' };

  if (raw.includes('/')) {
    const [first] = raw.split('/').map((part) => part.trim()).filter(Boolean);
    return { firstName: first || raw, lastName: 'Team' };
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Contact' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function ensureLastName(lastName, firstName, companyName) {
  const cleaned = clean(lastName);
  if (cleaned) return cleaned;
  if (clean(firstName) && clean(firstName) !== clean(companyName)) return 'Contact';
  return 'Contact';
}

function normalizePhone(phone) {
  return clean(phone)
    .replace(/\s*(ext|x|don)\b.*$/i, '')
    .replace(/[^\d+().\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

function normalizeZip(zip, country) {
  const cleaned = clean(zip);
  if (!cleaned) return '';
  if (normalizeCountry(country) === 'US') {
    const match = cleaned.match(/\d{5}/);
    return match ? match[0] : cleaned.replace(/[^\d-]/g, '').slice(0, 10);
  }
  return cleaned.slice(0, 16);
}

function getCompanyName(row, headerMap) {
  return cleanCompanyName(getField(row, headerMap, 'company_name'));
}

function getContactNames(row, headerMap, companyName) {
  const firstName = getField(row, headerMap, 'first_name');
  const lastName = getField(row, headerMap, 'last_name');
  if (firstName || lastName) {
    return {
      firstName: firstName || companyName,
      lastName: ensureLastName(lastName, firstName, companyName),
    };
  }

  const contactName = getField(row, headerMap, 'contact_name');
  if (contactName) {
    const split = splitContactName(contactName);
    return {
      firstName: split.firstName || companyName,
      lastName: ensureLastName(split.lastName, split.firstName, companyName),
    };
  }

  const split = splitContactName(companyName);
  return {
    firstName: split.firstName || companyName,
    lastName: ensureLastName(split.lastName, split.firstName, companyName),
  };
}

function getCity(row, headerMap) {
  const city = getField(row, headerMap, 'city');
  if (city) return city;
  return parseCityFromAdr4(getField(row, headerMap, 'adr4')) || '';
}

function getField(row, headerMap, key) {
  const col = headerMap[key];
  if (!col || !(col in row)) return '';
  return clean(row[col]);
}

function getAddress2(row, headerMap) {
  return getField(row, headerMap, 'address2') || null;
}

function buildShipToLocation({
  name,
  email,
  phone,
  address1,
  address2,
  city,
  state,
  zip,
  country,
  shipToName,
}) {
  return {
    name: shipToName || name,
    email,
    phone: phone || '',
    address1: address1 || '',
    address2: address2 || '',
    city: city || '',
    state,
    zip: zip || '',
    country,
    isPrimary: true,
    active: true,
  };
}

export function buildCustomerPayload(row, headerMap) {
  const name = getCompanyName(row, headerMap);
  const email = getField(row, headerMap, 'email');
  const phone = normalizePhone(getField(row, headerMap, 'phone'));
  const { firstName, lastName } = getContactNames(row, headerMap, name);
  const city = getCity(row, headerMap);
  const address1 = getField(row, headerMap, 'address1');
  const address2 = getAddress2(row, headerMap);
  const state = getField(row, headerMap, 'state');
  const country = getCountry(row, headerMap);
  const zip = normalizeZip(getField(row, headerMap, 'zip'), country);

  return {
    name,
    externalID: getField(row, headerMap, 'external_id') || null,
    phone: phone || '',
    email,
    website: getField(row, headerMap, 'website') || null,
    address1: address1 || null,
    address2,
    city: city || null,
    state,
    zip: zip || null,
    country,
    active: true,
    approved: false,
    companyLogo: false,
    contacts: [
      {
        firstName: firstName || name,
        lastName,
        email,
        phone: phone || '',
        isPrimary: true,
      },
    ],
    shipToLocations: [
      buildShipToLocation({
        name,
        email,
        phone,
        address1,
        address2,
        city,
        state,
        zip,
        country,
        shipToName: address2,
      }),
    ],
  };
}

export function validateCustomerRow(row, headerMap) {
  const problems = [];

  for (const field of REQUIRED_CUSTOMER_FIELDS) {
    if (field === 'company_name') {
      if (!getCompanyName(row, headerMap)) {
        problems.push('missing company name');
      }
      continue;
    }
    if (field === 'country') {
      if (!getCountry(row, headerMap)) {
        problems.push('missing country');
      }
      continue;
    }
    if (!getField(row, headerMap, field)) {
      const label = CUSTOMER_FIELD_ALIASES[field]?.[0] ?? field;
      problems.push(`missing ${label}`);
    }
  }

  for (const field of MARKETTIME_IMPORT_FIELDS) {
    if (field === 'city') {
      if (!getCity(row, headerMap)) problems.push('missing city');
      continue;
    }
    if (!getField(row, headerMap, field)) {
      problems.push(`missing ${field}`);
    }
  }

  return problems;
}

function pickBestSheet(workbook) {
  let bestName = workbook.SheetNames[0];
  let bestScore = -1;

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    if (!rows.length) continue;

    const headerMap = buildHeaderMap(Object.keys(rows[0]));
    const missing = getMissingRequiredColumns(headerMap).length;
    const score = rows.length * 10 - missing * 100;

    if (score > bestScore) {
      bestScore = score;
      bestName = sheetName;
    }
  }

  if (!bestName) {
    throw new Error('The Excel file has no sheets.');
  }

  return bestName;
}

export function parseWorkbookRows(workbook) {
  const sheetName = pickBestSheet(workbook);
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length > MAX_UPLOAD_ROWS) {
    throw new Error(`File has ${rows.length} rows. Maximum is ${MAX_UPLOAD_ROWS}.`);
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const headerMap = buildHeaderMap(headers);
  const missingRequiredColumns = getMissingRequiredColumns(headerMap);

  const columnMapping = Object.entries(headerMap).map(([field, column]) => ({
    field,
    column,
    label: CUSTOMER_FIELD_ALIASES[field]?.[0] ?? field,
  }));

  const parsed = rows.map((row, index) => {
    const validationErrors = missingRequiredColumns.length
      ? [`file is missing required columns: ${missingRequiredColumns.join(', ')}`]
      : validateCustomerRow(row, headerMap);

    const valid = validationErrors.length === 0;

    return {
      index,
      companyName: getCompanyName(row, headerMap) || `Row ${index + 1}`,
      valid,
      validationErrors,
      payload: valid ? buildCustomerPayload(row, headerMap) : null,
    };
  });

  return {
    sheetName,
    headers,
    headerMap,
    columnMapping,
    missingRequiredColumns,
    rows: parsed,
    summary: {
      total: parsed.length,
      valid: parsed.filter((r) => r.valid).length,
      invalid: parsed.filter((r) => !r.valid).length,
    },
  };
}

export function readExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  return parseWorkbookRows(workbook);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getPrimaryShipToLocationId(createResponse) {
  const shipTos = createResponse?.shipToLocations;
  if (!Array.isArray(shipTos) || shipTos.length === 0) return null;

  const primary = shipTos.find((loc) => loc.isPrimary) ?? shipTos[0];
  return primary?.recordID ?? null;
}

export async function assignSalespersonWithRetry(assignSalesperson, {
  customerId,
  shipToLocationId,
  salespersonId,
}) {
  let backoff = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await assignSalesperson({ customerId, shipToLocationId, salespersonId });
      return { assigned: true, detail: `Assigned to ${salespersonId}` };
    } catch (err) {
      const message = err.message ?? String(err);
      const isRetryable = /429|50[0-9]/i.test(message);

      if (!isRetryable || attempt === MAX_RETRIES) {
        return { assigned: false, detail: message };
      }

      await sleep(backoff);
      backoff *= 2;
    }
  }

  return { assigned: false, detail: 'Exhausted retries' };
}

export async function createCustomerWithRetry(createCustomer, payload, {
  assignSalesperson = null,
  salespersonId = null,
  approveCustomer = null,
} = {}) {
  let backoff = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await createCustomer(payload);
      const recordID = response?.recordID ?? response?.id ?? null;
      let assigned = null;
      let assignmentDetail = null;

      if (assignSalesperson && salespersonId && recordID) {
        const shipToLocationId = getPrimaryShipToLocationId(response);
        if (!shipToLocationId) {
          assigned = false;
          assignmentDetail = 'Created but no ship-to location to assign salesperson';
        } else {
          const assignment = await assignSalespersonWithRetry(assignSalesperson, {
            customerId: recordID,
            shipToLocationId,
            salespersonId,
          });
          assigned = assignment.assigned;
          assignmentDetail = assignment.detail;
        }
      }

      let approved = null;
      let approvalDetail = null;
      if (approveCustomer && recordID) {
        try {
          await approveCustomer(recordID);
          approved = true;
          approvalDetail = 'Approved for rep group';
        } catch (err) {
          approved = false;
          approvalDetail = err.message ?? String(err);
        }
      }

      const detailParts = [];
      if (assigned) detailParts.push(assignmentDetail);
      else if (assigned === false) detailParts.push(`salesperson not assigned (${assignmentDetail})`);
      if (approved === false) detailParts.push(`not approved (${approvalDetail})`);
      else if (approved) detailParts.push(approvalDetail);

      return {
        ok: true,
        detail: detailParts.length
          ? `Created and ${detailParts.join('; ')}`
          : 'Created',
        recordID,
        assigned,
        assignmentDetail,
        approved,
        approvalDetail,
        response,
      };
    } catch (err) {
      const message = err.message ?? String(err);
      const isRetryable = /429|50[0-9]/i.test(message);

      if (!isRetryable || attempt === MAX_RETRIES) {
        return { ok: false, detail: message };
      }

      await sleep(backoff);
      backoff *= 2;
    }
  }

  return { ok: false, detail: 'Exhausted retries' };
}

export async function importCustomerBatch(createCustomer, items, {
  assignSalesperson = null,
  salespersonId = null,
  approveCustomer = null,
} = {}) {
  const results = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const result = await createCustomerWithRetry(createCustomer, item.payload, {
      assignSalesperson,
      salespersonId,
      approveCustomer,
    });
    results.push({
      index: item.index,
      companyName: item.companyName,
      ...result,
    });

    if (i < items.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  return results;
}
