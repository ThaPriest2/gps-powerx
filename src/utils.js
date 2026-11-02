export const fmt = (n, d = 0) => (n == null ? '—' : Number(n).toLocaleString('en-NG', { maximumFractionDigits: d }));

export const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const isoDaysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

export const capacityText = (a) =>
  [a.solarKw > 0 && `${fmt(a.solarKw, 1)} kW solar`, a.inverterKw > 0 && `${fmt(a.inverterKw, 1)} kW inverter`, a.batteryKwh > 0 && `${fmt(a.batteryKwh, 1)} kWh battery`]
    .filter(Boolean)
    .join(' · ') || '—';

export const locationText = (b) => (b ? [b.area, b.lga, b.state].filter(Boolean).join(', ') : '—');

export const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };
