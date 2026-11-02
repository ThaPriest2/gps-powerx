import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { PageHeader, PostcodeTag, PriorityBadge, StatusBadge, Empty } from '../components/ui';
import { fmtDate } from '../utils';

const FLOW = ['Open', 'Assigned', 'In Progress', 'Resolved'];
const NEXT = { Open: null, Assigned: 'In Progress', 'In Progress': 'Resolved' };

function Stepper({ status }) {
  const i = FLOW.indexOf(status);
  return (
    <ol className="flow" aria-label={`Service status: ${status}`}>
      {FLOW.map((s, k) => <li key={s} className={k < i ? 'done' : k === i ? 'cur' : ''}>{s}</li>)}
    </ol>
  );
}

export default function Service({ data, route, refresh, navigate }) {
  const preset = route.query.get('asset') || '';
  const [assetId, setAssetId] = useState(preset);
  const [problem, setProblem] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [techId, setTechId] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [rowBusy, setRowBusy] = useState(null);

  useEffect(() => { if (preset) setAssetId(preset); }, [preset]);

  const asset = data.assets.find((a) => a.id === assetId);
  const techOf = (id) => data.technicians.find((t) => t.id === id);
  const assetOf = (id) => data.assets.find((a) => a.id === id);

  // Prefill from analytics when an asset is picked.
  useEffect(() => {
    if (!asset) return;
    const an = asset.analysis;
    setProblem(an.anomalies[0] ? `${an.anomalies[0].label}: ${an.anomalies[0].detail}` : '');
    setPriority(an.priority === 'Low' ? 'Medium' : an.priority);
    const local = data.technicians.find((t) => t.state === asset.building.state);
    setTechId(local ? local.id : '');
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const recommended = asset && data.technicians.find((t) => t.state === asset.building.state);
  const sorted = useMemo(() => [...data.assets].sort((a, b) => a.building.postcode.localeCompare(b.building.postcode)), [data.assets]);

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setMsg(null);
    if (!asset || !problem.trim()) return;
    setBusy(true);
    try {
      await api.createRequest({ assetId, problem, priority, technicianId: techId || undefined });
      await refresh();
      setMsg({ ok: true, text: `Service request created for ${asset.building.postcode}.` });
      setProblem('');
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
    setBusy(false);
  };

  const update = async (id, body) => {
    setRowBusy(id);
    try { await api.updateRequest(id, body); await refresh(); } catch (err) { setMsg({ ok: false, text: err.message }); }
    setRowBusy(null);
  };

  return (
    <>
      <PageHeader title="Technician mode" sub="Service requests carry the Digital Postcode and exact location, so the technician goes to the right building." />

      <div className="service-layout">
        <section className="card" aria-labelledby="new-req">
          <h2 id="new-req">New service request</h2>
          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="sr-asset">Energy asset</label>
              <select id="sr-asset" value={assetId} onChange={(e) => setAssetId(e.target.value)} aria-invalid={touched && !asset}>
                <option value="">Select an asset…</option>
                {sorted.map((a) => <option key={a.id} value={a.id}>{a.building.postcode} · {a.id} · {a.building.area}</option>)}
              </select>
              {touched && !asset && <small className="err">Select an energy asset.</small>}
            </div>

            {asset && (
              <div className="preview" aria-live="polite">
                <PostcodeTag code={asset.building.postcode} />
                <span>{asset.building.address}, {asset.building.lga}, {asset.building.state}</span>
                <span className="row"><StatusBadge status={asset.analysis.status} /><PriorityBadge priority={asset.analysis.priority} /></span>
              </div>
            )}

            <div className="field">
              <label htmlFor="sr-problem">Problem</label>
              <textarea id="sr-problem" rows="3" value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="Describe the fault or the work required" aria-invalid={touched && !problem.trim()} />
              {asset?.analysis.anomalies[0] && <small className="muted">Prefilled from the detected anomaly (rule-based, simulated data).</small>}
              {touched && !problem.trim() && <small className="err">Describe the problem.</small>}
            </div>
            <div className="two-col">
              <div className="field">
                <label htmlFor="sr-pr">Priority</label>
                <select id="sr-pr" value={priority} onChange={(e) => setPriority(e.target.value)}>{['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p}>{p}</option>)}</select>
              </div>
              <div className="field">
                <label htmlFor="sr-tech">Assign technician</label>
                <select id="sr-tech" value={techId} onChange={(e) => setTechId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {data.technicians.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.state}{recommended?.id === t.id ? ' (nearest)' : ''}</option>)}
                </select>
                {asset && !recommended && <small className="warn-text">No technician based in {asset.building.state}.</small>}
              </div>
            </div>
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create service request'}</button>
          </form>
          <div aria-live="polite">{msg && <div className={`notice ${msg.ok ? 'ok' : 'err'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</div>}</div>
        </section>

        <section aria-labelledby="req-list">
          <h2 id="req-list" className="sec-title">Service requests <span className="muted">({data.requests.length})</span></h2>
          {data.requests.length === 0 ? (
            <Empty title="No service requests yet">Create one from the form, or from an asset with an alert.</Empty>
          ) : (
            <ul className="req-list">
              {data.requests.map((r) => {
                const t = techOf(r.technicianId);
                const a = assetOf(r.assetId);
                const next = NEXT[r.status];
                return (
                  <li key={r.id} className="card req">
                    <div className="req-top">
                      <PostcodeTag code={r.postcode} />
                      <PriorityBadge priority={r.priority} />
                      <span className="mono muted">{r.id}</span>
                    </div>
                    <p className="req-problem">{r.problem}</p>
                    <p className="muted small">{r.location}</p>
                    <p className="small">
                      <button className="link" onClick={() => navigate(`#/assets/${r.assetId}`)}>{r.assetId}</button>
                      {a && <> · {a.type}</>} · opened {fmtDate(r.createdAt)}
                    </p>
                    <Stepper status={r.status} />
                    <div className="req-actions">
                      {r.status !== 'Resolved' && (
                        <>
                          <label className="sr" htmlFor={`as-${r.id}`}>Assign technician for {r.id}</label>
                          <select id={`as-${r.id}`} value={r.technicianId || ''} onChange={(e) => e.target.value && update(r.id, { technicianId: e.target.value })} disabled={rowBusy === r.id}>
                            <option value="">Assign technician…</option>
                            {data.technicians.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.state}</option>)}
                          </select>
                          {next && <button className="btn btn-primary" disabled={rowBusy === r.id} onClick={() => update(r.id, { status: next })}>{next === 'In Progress' ? 'Start work' : 'Mark resolved'}</button>}
                        </>
                      )}
                      {t && <span className="small">Technician: <b>{t.name}</b> · {t.phone}</span>}
                      {r.status === 'Resolved' && <span className="small ok-text">Resolved. Asset service dates updated.</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
