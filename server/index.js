import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb, mutate, resetDb, nextId } from './store.js';
import { lookupPostcode, isLive, cfg, httpError } from './postcodeService.js';
import { snapshot, series } from './telemetry.js';
import { analyze, deploymentInsights, RULES } from './analytics.js';
import { DEMO_POSTCODES, DEMO_SCENARIO } from './seed.js';

const app = express();
app.use(express.json({ limit: '100kb' }));

const TYPES = ['Inverter', 'Solar', 'Battery', 'Hybrid System'];
const STATUSES = ['Online', 'Offline'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const FLOW = ['Open', 'Assigned', 'In Progress', 'Resolved'];
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => new Date(new Date(d + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);

function enrich(db) {
  const bMap = Object.fromEntries(db.buildings.map((b) => [b.id, b]));
  return db.assets.map((a) => {
    const telemetry = snapshot(a);
    const analysis = analyze(a, telemetry);
    const openRequest = db.requests.find((r) => r.assetId === a.id && r.status !== 'Resolved');
    return { ...a, building: bMap[a.buildingId], telemetry, analysis, openRequestId: openRequest?.id || null };
  });
}

function summarize(db, assets) {
  const sum = (k) => assets.reduce((t, a) => t + (a[k] || 0), 0);
  const byState = {};
  assets.forEach((a) => {
    const s = a.building?.state || 'Unknown';
    byState[s] ||= { state: s, assets: 0, solarKw: 0, batteryKwh: 0 };
    byState[s].assets += 1;
    byState[s].solarKw += a.solarKw;
    byState[s].batteryKwh += a.batteryKwh;
  });
  const count = (fn) => assets.filter(fn).length;
  return {
    buildings: db.buildings.length,
    assets: assets.length,
    online: count((a) => a.analysis.status === 'Online'),
    degraded: count((a) => a.analysis.status === 'Degraded'),
    offline: count((a) => a.analysis.status === 'Offline'),
    solarKw: sum('solarKw'),
    inverterKw: sum('inverterKw'),
    batteryKwh: sum('batteryKwh'),
    needsMaintenance: count((a) => a.analysis.needsMaintenance),
    openRequests: db.requests.filter((r) => r.status !== 'Resolved').length,
    states: Object.keys(byState).length,
    avgHealth: assets.length ? Math.round(assets.reduce((t, a) => t + a.analysis.healthScore, 0) / assets.length) : 0,
    byState: Object.values(byState).sort((a, b) => b.solarKw - a.solarKw),
    byPriority: PRIORITIES.map((p) => ({ priority: p, count: count((a) => a.analysis.priority === p) })),
  };
}

app.get('/api/config', (_req, res) => {
  const live = isLive();
  res.json({
    mode: live ? 'live' : 'demo',
    fallbackEnabled: cfg().fallback,
    scenario: DEMO_SCENARIO,
    demoPostcodes: live ? [] : DEMO_POSTCODES.map((p) => ({ postcode: p.postcode, area: p.area, state: p.state })),
    rules: RULES,
  });
});

app.get('/api/state', (_req, res) => {
  const db = getDb();
  const assets = enrich(db);
  res.json({
    buildings: db.buildings,
    assets,
    technicians: db.technicians,
    requests: db.requests,
    summary: summarize(db, assets),
    deployment: deploymentInsights(assets, db.technicians),
  });
});

app.get('/api/postcode/:code', wrap(async (req, res) => {
  const result = await lookupPostcode(req.params.code);
  const existing = getDb().buildings.find((b) => b.postcode.replace(/[^A-Z0-9]/gi, '').toUpperCase() === String(result.record.postcode).replace(/[^A-Z0-9]/gi, '').toUpperCase());
  res.json({ ...result, existingBuilding: existing || null });
}));

app.post('/api/buildings', wrap(async (req, res) => {
  const result = await lookupPostcode(req.body?.postcode);
  const norm = (s) => String(s).replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const db = getDb();
  const existing = db.buildings.find((b) => norm(b.postcode) === norm(result.record.postcode));
  if (existing) return res.json({ building: existing, created: false });
  const building = mutate((d) => {
    const b = {
      id: nextId('PX-BLD', d.buildings, 1001),
      ...result.record,
      source: result.source,
      registeredAt: new Date().toISOString(),
    };
    d.buildings.push(b);
    return b;
  });
  res.status(201).json({ building, created: true });
}));

app.post('/api/assets', wrap(async (req, res) => {
  const b = req.body || {};
  const db = getDb();
  const building = db.buildings.find((x) => x.id === b.buildingId);
  if (!building) throw httpError(400, 'Register the building (postcode) first.');
  if (!TYPES.includes(b.type)) throw httpError(400, 'Choose an asset type.');
  if (!STATUSES.includes(b.status)) throw httpError(400, 'Choose a current status.');
  if (!String(b.installer || '').trim()) throw httpError(400, 'Installer is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.installDate || '') || b.installDate > today()) throw httpError(400, 'Installation date must be a valid date that is not in the future.');
  const n = (v) => (v === '' || v == null ? 0 : Number(v));
  const solarKw = n(b.solarKw), inverterKw = n(b.inverterKw), batteryKwh = n(b.batteryKwh);
  if ([solarKw, inverterKw, batteryKwh].some((x) => !Number.isFinite(x) || x < 0 || x > 100000)) throw httpError(400, 'Capacity values must be positive numbers.');
  const needs = { Solar: solarKw, Inverter: inverterKw, Battery: batteryKwh, 'Hybrid System': solarKw && inverterKw && batteryKwh };
  if (!needs[b.type]) throw httpError(400, b.type === 'Hybrid System' ? 'A hybrid system needs solar, inverter and battery capacity.' : `Enter the ${b.type.toLowerCase()} capacity.`);

  const asset = mutate((d) => {
    const id = String(b.id || '').trim() || nextId('PX-AST', d.assets, 1001);
    if (d.assets.some((a) => a.id.toLowerCase() === id.toLowerCase())) throw httpError(409, `Asset ID ${id} already exists.`);
    const a = {
      id,
      buildingId: building.id,
      type: b.type,
      solarKw: b.type === 'Solar' || b.type === 'Hybrid System' ? solarKw : 0,
      inverterKw: b.type === 'Inverter' || b.type === 'Hybrid System' ? inverterKw : 0,
      batteryKwh: b.type === 'Battery' || b.type === 'Hybrid System' ? batteryKwh : 0,
      installDate: b.installDate,
      installer: String(b.installer).trim().slice(0, 80),
      status: b.status,
      lastService: b.installDate,
      nextService: addDays(b.installDate, 180),
      anomaly: null,
    };
    d.assets.push(a);
    return a;
  });
  res.status(201).json({ asset });
}));

app.get('/api/assets/:id', (req, res) => {
  const db = getDb();
  const asset = enrich(db).find((a) => a.id === req.params.id);
  if (!asset) return res.status(404).json({ error: `Asset ${req.params.id} not found.` });
  res.json({ asset, series: series(asset), rules: RULES });
});

app.post('/api/requests', wrap(async (req, res) => {
  const b = req.body || {};
  const db = getDb();
  const asset = db.assets.find((a) => a.id === b.assetId);
  if (!asset) throw httpError(400, 'Select an energy asset.');
  if (!String(b.problem || '').trim()) throw httpError(400, 'Describe the problem.');
  if (!PRIORITIES.includes(b.priority)) throw httpError(400, 'Choose a priority.');
  if (b.technicianId && !db.technicians.some((t) => t.id === b.technicianId)) throw httpError(400, 'Unknown technician.');
  const building = db.buildings.find((x) => x.id === asset.buildingId);
  const request = mutate((d) => {
    const r = {
      id: nextId('SR', d.requests, 1001),
      assetId: asset.id,
      buildingId: building.id,
      postcode: building.postcode,
      location: `${building.address}, ${building.lga}, ${building.state}`,
      problem: String(b.problem).trim().slice(0, 500),
      priority: b.priority,
      status: b.technicianId ? 'Assigned' : 'Open',
      technicianId: b.technicianId || null,
      createdAt: new Date().toISOString(),
    };
    d.requests.unshift(r);
    return r;
  });
  res.status(201).json({ request });
}));

app.patch('/api/requests/:id', wrap(async (req, res) => {
  const { status, technicianId } = req.body || {};
  const db = getDb();
  const r = db.requests.find((x) => x.id === req.params.id);
  if (!r) throw httpError(404, 'Service request not found.');
  if (status && !FLOW.includes(status)) throw httpError(400, 'Invalid status.');
  if (technicianId && !db.technicians.some((t) => t.id === technicianId)) throw httpError(400, 'Unknown technician.');
  const updated = mutate((d) => {
    const x = d.requests.find((q) => q.id === req.params.id);
    if (technicianId) {
      x.technicianId = technicianId;
      if (x.status === 'Open') x.status = 'Assigned';
    }
    if (status) {
      if (status !== 'Open' && !x.technicianId) throw httpError(400, 'Assign a technician first.');
      x.status = status;
      if (status === 'Resolved') {
        const a = d.assets.find((q) => q.id === x.assetId);
        if (a) {
          a.anomaly = null;
          if (a.status === 'Offline') a.status = 'Online';
          a.lastService = today();
          a.nextService = addDays(today(), 180);
        }
      }
    }
    return x;
  });
  res.json({ request: updated });
}));

// Demo controls (simulation only)
app.post('/api/demo/anomaly', wrap(async (req, res) => {
  const found = getDb().assets.find((a) => a.id === req.body?.assetId);
  if (!found) throw httpError(404, 'Asset not found.');
  mutate((d) => {
    d.assets.find((a) => a.id === found.id).anomaly = { code: 'underperformance', onsetHour: 11 };
  });
  res.json({ ok: true });
}));

app.post('/api/demo/reset', (_req, res) => {
  resetDb();
  res.json({ ok: true });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.status ? 'Unexpected server error.' : err.message, ...(err.data || {}) });
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`GPS PowerX API on http://localhost:${port} — ${isLive() ? 'LIVE postcode API configured' : 'DEMO MODE (test postcode data)'}`);
});
