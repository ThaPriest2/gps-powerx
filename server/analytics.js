// TRANSPARENT RULE-BASED ANALYTICS. This is NOT a trained machine-learning model.
// Every score, alert and recommendation below comes from fixed thresholds that are
// listed in `RULES` and returned with each result, so the logic can be inspected.

import { isOffline } from './telemetry.js';

export const RULES = [
  { id: 'offline', text: 'Asset offline / no output → Critical priority, -50 health' },
  { id: 'performance', text: 'Performance ratio < 0.80 of expected solar output → anomaly, -(0.92 - PR) × 120 health (max -45)' },
  { id: 'battery-temp', text: 'Battery temperature > 40 °C → thermal anomaly, -3 health per °C (max -25), at least High priority' },
  { id: 'inverter-temp', text: 'Inverter temperature > 65 °C → anomaly, -1.5 health per °C (max -15)' },
  { id: 'service', text: 'Service overdue → -1 health per 3 days overdue (max -15); due within 14 days → Medium priority' },
  { id: 'priority', text: 'Priority: Critical = offline or health < 40; High = health < 60 or thermal; Medium = health < 80 or service due ≤ 14 days; else Low' },
];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function daysUntil(dateStr) {
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.round((new Date(dateStr + 'T00:00:00Z') - today) / 86400000);
}

export function analyze(asset, snap) {
  const anomalies = [];
  const fired = [];
  let penalty = 0;
  const offline = isOffline(asset);

  if (offline) {
    penalty += 50;
    fired.push('offline');
    anomalies.push({ code: 'offline', label: 'Output / communication loss', detail: 'No output or telemetry received — asset appears offline.' });
  } else {
    if (snap.performanceRatio != null && snap.performanceRatio < 0.8) {
      penalty += Math.min(45, (0.92 - snap.performanceRatio) * 120);
      fired.push('performance');
      anomalies.push({
        code: 'underperformance',
        label: 'Performance anomaly',
        detail: `Solar output is ${Math.round((1 - snap.performanceRatio) * 100)}% below expected (performance ratio ${snap.performanceRatio}).`,
      });
    }
    if (snap.batteryTempC != null && snap.batteryTempC > 40) {
      penalty += Math.min(25, (snap.batteryTempC - 40) * 3);
      fired.push('battery-temp');
      anomalies.push({ code: 'thermal', label: 'Battery thermal drift', detail: `Battery at ${snap.batteryTempC} °C (normal < 40 °C).` });
    }
    if (snap.inverterTempC != null && snap.inverterTempC > 65) {
      penalty += Math.min(15, (snap.inverterTempC - 65) * 1.5);
      fired.push('inverter-temp');
      anomalies.push({ code: 'inverter-heat', label: 'Inverter running hot', detail: `Inverter at ${snap.inverterTempC} °C (threshold 65 °C).` });
    }
  }

  const days = daysUntil(asset.nextService);
  const overdue = days < 0;
  const dueSoon = days >= 0 && days <= 14;
  if (overdue) {
    penalty += Math.min(15, -days / 3);
    fired.push('service');
  }

  const healthScore = clamp(Math.round(100 - penalty), 5, 100);
  const thermal = anomalies.some((x) => x.code === 'thermal');

  let priority = 'Low';
  if (offline || healthScore < 40) priority = 'Critical';
  else if (healthScore < 60 || thermal) priority = 'High';
  else if (healthScore < 80 || dueSoon || overdue) priority = 'Medium';

  const top = anomalies[0]?.code;
  let recommendedAction;
  if (top === 'offline') recommendedAction = 'Dispatch a technician: check inverter communications, AC isolator and data gateway.';
  else if (top === 'underperformance') recommendedAction = 'Schedule panel inspection and cleaning; check string connectors and shading.';
  else if (top === 'thermal') recommendedAction = 'Inspect battery ventilation and BMS; lower the discharge limit until serviced.';
  else if (top === 'inverter-heat') recommendedAction = 'Check inverter cooling and ventilation clearance.';
  else if (overdue) recommendedAction = `Book routine service — overdue by ${-days} days.`;
  else if (dueSoon) recommendedAction = `Plan routine service within ${days} days.`;
  else recommendedAction = `No action needed. Next service in ${days} days.`;

  const status = offline ? 'Offline' : anomalies.length ? 'Degraded' : 'Online';

  return {
    simulated: true,
    healthScore,
    priority,
    status,
    anomalies,
    recommendedAction,
    rulesFired: fired,
    nextServiceInDays: days,
    serviceOverdue: overdue,
    needsMaintenance: priority !== 'Low',
  };
}

// Rule-based deployment recommendations across the whole portfolio.
export function deploymentInsights(assets, technicians) {
  const out = [];

  assets
    .filter((a) => a.type === 'Solar' && a.batteryKwh === 0 && a.building)
    .forEach((a) =>
      out.push({
        kind: 'Battery retrofit',
        score: 80 + Math.min(15, a.solarKw / 2),
        title: `Add storage at ${a.building.postcode}`,
        detail: `${a.solarKw} kW solar with no battery in ${a.building.area}, ${a.building.lga}. Candidate for a battery retrofit.`,
        postcode: a.building.postcode,
      }),
    );

  const byState = {};
  assets.forEach((a) => {
    const s = a.building?.state;
    if (s) byState[s] = (byState[s] || 0) + 1;
  });
  Object.entries(byState).forEach(([state, n]) => {
    if (!technicians.some((t) => t.state === state)) {
      out.push({
        kind: 'Technician coverage gap',
        score: 70 + n * 5,
        title: `No technician based in ${state}`,
        detail: `${n} registered asset${n > 1 ? 's' : ''} in ${state} with no local technician. Recruit or partner to cut response time.`,
        postcode: null,
      });
    }
  });

  const byLga = {};
  assets.forEach((a) => {
    const k = a.building && `${a.building.lga}, ${a.building.state}`;
    if (k) byLga[k] = (byLga[k] || 0) + 1;
  });
  Object.entries(byLga).forEach(([lga, n]) => {
    if (n >= 3) {
      out.push({
        kind: 'Service hub candidate',
        score: 60 + n * 4,
        title: `Cluster in ${lga}`,
        detail: `${n} systems in one LGA. A local service hub would shorten field visits and enable fleet-level planning.`,
        postcode: null,
      });
    }
  });

  return out.sort((x, y) => y.score - x.score).slice(0, 6);
}
