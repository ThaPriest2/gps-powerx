import { useCallback, useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { api } from '../api';
import { PageHeader, PostcodeTag, StatusBadge, PriorityBadge, HealthRing, SimTag, ServiceDue, Loading, ErrorBox, Icon } from '../components/ui';
import { fmt, fmtDate, locationText } from '../utils';

function Reading({ label, value, unit, warn }) {
  return (
    <div className={`reading ${warn ? 'warn' : ''}`}>
      <small>{label}</small>
      <b>{value == null ? '—' : `${value}${unit || ''}`}</b>
    </div>
  );
}

export default function AssetDetail({ route, navigate, refresh, data }) {
  const id = route.param;
  const [state, setState] = useState({ status: 'loading' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent) => {
    if (!silent) setState({ status: 'loading' });
    try {
      const r = await api.asset(id);
      setState({ status: 'ok', ...r });
    } catch (e) {
      setState((s) => (silent && s.status === 'ok' ? s : { status: 'error', message: e.message, notFound: e.status === 404 }));
    }
  }, [id]);

  useEffect(() => {
    load(false);
  }, [load]);

  // The app polls every 6s and also refreshes right after demo actions; reload this asset
  // (incl. its chart series) whenever that shared data changes so alerts appear instantly.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    load(true);
  }, [data, load]);

  const back = <button className="link" onClick={() => navigate('#/assets')}>← All assets</button>;
  if (state.status === 'loading') return <Loading label="Loading asset…" />;
  if (state.status === 'error') return <><ErrorBox message={state.message} onRetry={state.notFound ? undefined : () => load(false)} />{back}</>;

  const { asset: a, series } = state;
  const t = a.telemetry;
  const an = a.analysis;
  const openReq = data.requests.find((r) => r.assetId === a.id && r.status !== 'Resolved');

  const simulate = async () => {
    setBusy(true);
    try { await api.triggerAnomaly(a.id); await refresh(); } finally { setBusy(false); }
  };

  return (
    <>
      {back}
      <PageHeader title={a.id} sub={`${a.type} · installed ${fmtDate(a.installDate)} by ${a.installer}`}>
        <StatusBadge status={an.status} />
        <PriorityBadge priority={an.priority} />
      </PageHeader>

      <section className="card identity" aria-label="Identity chain">
        <div className="chain big">
          <div><small>Digital Postcode</small><PostcodeTag code={a.building.postcode} size="lg" /></div>
          <Icon name="arrow" /><div><small>Building ID</small><b className="mono">{a.building.id}</b></div>
          <Icon name="arrow" /><div><small>Asset ID</small><b className="mono">{a.id}</b></div>
        </div>
        <p className="muted">{a.building.address} · {locationText(a.building)}{a.building.lat != null && <> · <span className="mono">{a.building.lat.toFixed(4)}, {a.building.lng.toFixed(4)}</span></>}</p>
      </section>

      {an.anomalies.length > 0 && (
        <div className="notice err alert-banner" role="alert">
          <b>{an.anomalies[0].label}.</b> {an.anomalies[0].detail} <span className="muted">Rule-based alert · simulated data.</span>
          <div className="row">
            {openReq ? <button className="btn" onClick={() => navigate('#/service')}>Service request {openReq.id} · {openReq.status}</button>
              : <button className="btn btn-primary" onClick={() => navigate(`#/service?asset=${a.id}`)}>Create maintenance request</button>}
          </div>
        </div>
      )}

      <div className="grid two">
        <section className="card">
          <h2>System</h2>
          <dl className="dl compact">
            <div><dt>Solar capacity</dt><dd>{a.solarKw > 0 ? `${fmt(a.solarKw, 1)} kW` : '—'}</dd></div>
            <div><dt>Inverter capacity</dt><dd>{a.inverterKw > 0 ? `${fmt(a.inverterKw, 1)} kW` : '—'}</dd></div>
            <div><dt>Battery capacity</dt><dd>{a.batteryKwh > 0 ? `${fmt(a.batteryKwh, 1)} kWh` : '—'}</dd></div>
            <div><dt>System status</dt><dd><StatusBadge status={an.status} /></dd></div>
            <div><dt>Last service</dt><dd>{fmtDate(a.lastService)}</dd></div>
            <div><dt>Next service</dt><dd>{fmtDate(a.nextService)} <ServiceDue days={an.nextServiceInDays} /></dd></div>
          </dl>
        </section>
        <section className="card health">
          <div className="card-head"><h2>Energy health</h2><SimTag>DEMO ANALYTICS</SimTag></div>
          <div className="health-row">
            <HealthRing score={an.healthScore} size={110} />
            <div>
              <p><b>Priority:</b> <PriorityBadge priority={an.priority} /></p>
              <p><b>Recommended action</b><br />{an.recommendedAction}</p>
            </div>
          </div>
          <p className="muted small">Score from transparent threshold rules, not a trained model. Rules fired: {an.rulesFired.length ? an.rulesFired.join(', ') : 'none'}.</p>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Live monitoring</h2>
          <SimTag>SIMULATED · no IoT hardware connected</SimTag>
        </div>
        <div className="readings">
          <Reading label="Solar output" value={t.outputKw} unit=" kW" />
          <Reading label="Expected output" value={t.expectedKw} unit=" kW" />
          <Reading label="Performance ratio" value={t.performanceRatio} warn={t.performanceRatio != null && t.performanceRatio < 0.8} />
          <Reading label="Battery charge" value={t.batterySocPct} unit="%" />
          <Reading label="Battery temp" value={t.batteryTempC} unit=" °C" warn={t.batteryTempC > 40} />
          <Reading label="Inverter temp" value={t.inverterTempC} unit=" °C" warn={t.inverterTempC > 65} />
          <Reading label="Grid voltage" value={t.gridVoltageV} unit=" V" />
          <Reading label="Inverter load" value={t.loadKw} unit=" kW" />
          <Reading label="Last seen" value={t.lastSeenMinutesAgo ? `${Math.round(t.lastSeenMinutesAgo / 60)}h ago` : 'now'} />
        </div>
        {series.length > 0 ? (
          <div className="chart" role="img" aria-label="Line chart of simulated expected versus actual solar output through the day">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={series} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e9e5" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" kW" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="expected" name="Expected" stroke="#9aa9a2" strokeDasharray="5 4" dot={false} />
                <Line type="monotone" dataKey="actual" name="Actual (simulated)" stroke="#13774f" strokeWidth={3} dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="muted">This asset type has no solar generation to chart.</p>}
        <div className="row">
          <button className="btn" onClick={simulate} disabled={busy || an.anomalies.some((x) => x.code === 'underperformance')}>{busy ? 'Simulating…' : 'Simulate abnormal performance (demo control)'}</button>
          <button className="btn" onClick={() => navigate(`#/map/${a.id}`)}>View on map</button>
          <button className="btn btn-primary" onClick={() => navigate(`#/service?asset=${a.id}`)}>Create service request</button>
        </div>
      </section>
    </>
  );
}
