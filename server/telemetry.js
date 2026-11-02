// SIMULATED sensor model. No IoT hardware is connected in this MVP.
// Readings are deterministic per asset (hash-seeded) with small time-based drift.
// The model uses a simulated midday so output is visible at any time of day (e.g. during a pitch).

const SIM_HOUR = 12;
const DERATE = 0.82;

const hash = (s) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
};
const rnd = (seed) => {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const sun = (h) => (h <= 6 || h >= 18 ? 0 : Math.pow(Math.sin((Math.PI * (h - 6)) / 12), 1.2));
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;

function activeAnomaly(asset, hour) {
  const a = asset.anomaly;
  return a && hour >= (a.onsetHour ?? 6) ? a.code : null;
}

function performanceRatio(asset, hour, seed) {
  if (asset.status === 'Offline') return 0;
  const code = activeAnomaly(asset, hour);
  const n = rnd(seed);
  if (code === 'offline') return 0;
  if (code === 'underperformance') return 0.42 + n * 0.1;
  return 0.94 + n * 0.05;
}

export function isOffline(asset) {
  return asset.status === 'Offline' || asset.anomaly?.code === 'offline';
}

export function snapshot(asset, now = Date.now()) {
  const tick = Math.floor(now / 5000);
  const base = hash(asset.id);
  const seed = base + tick;
  const offline = isOffline(asset);
  const hasSolar = asset.solarKw > 0;
  const hasBattery = asset.batteryKwh > 0;
  const hasInverter = asset.inverterKw > 0 || hasSolar;
  const thermal = activeAnomaly(asset, SIM_HOUR) === 'thermal';

  const expectedKw = hasSolar ? r2(asset.solarKw * sun(SIM_HOUR) * DERATE) : null;
  const pr = hasSolar ? performanceRatio(asset, SIM_HOUR, seed + 2) : null;
  const outputKw = hasSolar ? r2(expectedKw * pr) : null;

  return {
    simulated: true,
    timestamp: new Date(now).toISOString(),
    expectedKw,
    outputKw,
    performanceRatio: pr == null ? null : r2(pr),
    loadKw: !hasSolar && asset.inverterKw > 0 && !offline ? r1(asset.inverterKw * (0.3 + rnd(seed + 5) * 0.2)) : null,
    batterySocPct: hasBattery && !offline ? Math.round(55 + rnd(base + 7) * 30 + (rnd(seed + 8) - 0.5) * 2) : null,
    batteryTempC: hasBattery && !offline ? r1(thermal ? 47 + rnd(seed + 3) * 4 : 31 + rnd(seed + 3) * 3) : null,
    inverterTempC: hasInverter && !offline ? r1(48 + rnd(base + 9) * 6 + (rnd(seed + 4) - 0.5)) : null,
    gridVoltageV: hasInverter && !offline ? r1(226 + rnd(seed + 6) * 10) : null,
    lastSeenMinutesAgo: offline ? 18 * 60 + Math.round(rnd(base + 11) * 300) : 0,
  };
}

// Simulated day profile (06:00-18:00). Actual stops at the simulated "now" (12:00).
export function series(asset) {
  if (!(asset.solarKw > 0)) return [];
  const base = hash(asset.id);
  const out = [];
  for (let h = 6; h <= 18; h++) {
    const expected = r2(asset.solarKw * sun(h) * DERATE);
    const actual = h <= SIM_HOUR ? r2(expected * performanceRatio(asset, h, base + h * 31)) : null;
    out.push({ hour: `${String(h).padStart(2, '0')}:00`, expected, actual });
  }
  return out;
}
