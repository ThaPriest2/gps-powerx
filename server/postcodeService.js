// API service layer for the official NIPOST Digital Postcode API.
// The API key is read from environment variables and used ONLY here, on the server.
//
// IMPORTANT: the exact endpoint path, auth header and response field names must be confirmed
// against the official NIPOST API documentation. They are configurable via env vars and the
// response mapper (mapLive) accepts several common field names. Adjust mapLive() if needed.

import { DEMO_POSTCODES } from './seed.js';

const strip = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function httpError(status, message, data) {
  const e = new Error(message);
  e.status = status;
  e.data = data;
  return e;
}

export const cfg = () => ({
  base: process.env.POSTCODE_API_BASE_URL?.trim(),
  key: process.env.POSTCODE_API_KEY?.trim(),
  path: process.env.POSTCODE_API_LOOKUP_PATH?.trim() || '/postcode/{code}',
  keyHeader: process.env.POSTCODE_API_KEY_HEADER?.trim() || 'Authorization',
  keyScheme: process.env.POSTCODE_API_KEY_SCHEME ?? 'Bearer',
  forceDemo: process.env.DEMO_MODE === 'true',
  fallback: process.env.PITCH_FALLBACK !== 'false',
  timeout: Number(process.env.POSTCODE_API_TIMEOUT_MS) || 8000,
});

export const isLive = () => {
  const c = cfg();
  return Boolean(c.base && c.key && !c.forceDemo);
};

const pick = (o, keys) => {
  for (const k of keys) if (o?.[k] != null && o[k] !== '') return o[k];
  return null;
};
const num = (v) => {
  const n = Number(v);
  return v == null || Number.isNaN(n) ? null : n;
};

function mapLive(json, code) {
  let d = json?.data ?? json?.result ?? json;
  if (Array.isArray(d)) d = d[0];
  const loc = d?.location || d?.coordinates || d?.geometry || {};
  return {
    postcode: pick(d, ['digitalPostcode', 'digital_postcode', 'postcode', 'postCode', 'code']) || code,
    address: pick(d, ['formattedAddress', 'formatted_address', 'address', 'fullAddress', 'street']),
    area: pick(d, ['area', 'district', 'neighbourhood', 'neighborhood', 'city', 'town']),
    state: pick(d, ['state', 'stateName']),
    lga: pick(d, ['lga', 'lgaName', 'localGovernmentArea', 'local_government_area', 'localGovernment']),
    lat: num(pick(d, ['latitude', 'lat']) ?? pick(loc, ['latitude', 'lat'])),
    lng: num(pick(d, ['longitude', 'lng', 'lon']) ?? pick(loc, ['longitude', 'lng', 'lon'])),
  };
}

export function validate(code) {
  const s = strip(code);
  return s.length >= 5 && s.length <= 16 ? s : null;
}

export async function lookupPostcode(raw) {
  const s = validate(raw);
  if (!s) throw httpError(400, 'Enter a valid Digital Postcode (letters and numbers, 5–16 characters).');

  const demoRec = DEMO_POSTCODES.find((p) => strip(p.postcode) === s);

  if (!isLive()) {
    if (!demoRec) {
      throw httpError(
        404,
        'Postcode not found in the DEMO test set. DEMO MODE does not query the live NIPOST API.',
        { suggestions: DEMO_POSTCODES.map((p) => p.postcode) },
      );
    }
    return { source: 'demo', record: demoRec };
  }

  const c = cfg();
  const fallbackOrThrow = (reason) => {
    if (c.fallback && demoRec) {
      return {
        source: 'demo-fallback',
        warning: `Live NIPOST API unavailable (${reason}). Showing TEST data — not live government data.`,
        record: demoRec,
      };
    }
    throw httpError(502, `The NIPOST Digital Postcode API is unavailable (${reason}). Try again, or switch to DEMO MODE.`);
  };

  const url = c.base.replace(/\/+$/, '') + c.path.replace('{code}', encodeURIComponent(String(raw).trim()));
  const headers = { Accept: 'application/json' };
  headers[c.keyHeader] = c.keyScheme ? `${c.keyScheme} ${c.key}` : c.key;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), c.timeout);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (res.status === 404) throw httpError(404, 'Postcode not found in the NIPOST Digital Postcode API.');
    if (res.status === 401 || res.status === 403) return fallbackOrThrow('credentials rejected');
    if (!res.ok) return fallbackOrThrow(`HTTP ${res.status}`);
    const record = mapLive(await res.json(), String(raw).trim().toUpperCase());
    return { source: 'live', record };
  } catch (e) {
    if (e.status) throw e;
    return fallbackOrThrow(e.name === 'AbortError' ? 'timeout' : 'network error');
  } finally {
    clearTimeout(timer);
  }
}
