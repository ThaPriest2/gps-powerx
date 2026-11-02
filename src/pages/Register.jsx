import { useState } from 'react';
import Pipeline from '../components/Pipeline';
import { PageHeader, PostcodeTag, SourceBadge, Icon } from '../components/ui';
import { todayISO, capacityText, locationText } from '../utils';

const TYPES = ['Solar', 'Inverter', 'Battery', 'Hybrid System'];
const emptyForm = () => ({ id: '', type: 'Hybrid System', solarKw: '', inverterKw: '', batteryKwh: '', installDate: todayISO(), installer: '', status: 'Online' });

function Field({ id, label, hint, error, children }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <small id={`${id}-h`}>{hint}</small>}
      {error && <small id={`${id}-e`} className="err">{error}</small>}
    </div>
  );
}

export default function Register({ reg, config, navigate, data }) {
  const { pc, setPc, lookup, doLookup, building, asset } = reg;
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const record = lookup.status === 'ok' ? lookup.record : null;
  const step = asset ? 3 : building ? 3 : record ? 2 : 1;

  const onLookup = async (e) => {
    e?.preventDefault();
    setMsg(null);
    try { await doLookup(pc); } catch { /* shown via lookup.status */ }
  };

  const onRegisterBuilding = async () => {
    setBusy(true); setMsg(null);
    try { await reg.registerBuilding(); } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const validate = () => {
    const er = {};
    const showSolar = form.type === 'Solar' || form.type === 'Hybrid System';
    const showInv = form.type === 'Inverter' || form.type === 'Hybrid System';
    const showBat = form.type === 'Battery' || form.type === 'Hybrid System';
    if (showSolar && !(Number(form.solarKw) > 0)) er.solarKw = 'Enter solar capacity in kW.';
    if (showInv && !(Number(form.inverterKw) > 0)) er.inverterKw = 'Enter inverter capacity in kW.';
    if (showBat && !(Number(form.batteryKwh) > 0)) er.batteryKwh = 'Enter battery capacity in kWh.';
    if (!form.installer.trim()) er.installer = 'Installer is required.';
    if (!form.installDate || form.installDate > todayISO()) er.installDate = 'Use a date that is not in the future.';
    return er;
  };

  const onRegisterAsset = async (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true); setMsg(null);
    try { await reg.registerAsset(form); setForm(emptyForm()); } catch (err) { setMsg(err.message); }
    setBusy(false);
  };

  const fillDemo = () => {
    const s = config.scenario.asset;
    setErrors({});
    setForm({ id: '', type: s.type, solarKw: s.solarKw, inverterKw: s.inverterKw, batteryKwh: s.batteryKwh, installDate: todayISO(), installer: s.installer, status: s.status });
  };

  const showSolar = form.type === 'Solar' || form.type === 'Hybrid System';
  const showInv = form.type === 'Inverter' || form.type === 'Hybrid System';
  const showBat = form.type === 'Battery' || form.type === 'Hybrid System';

  return (
    <>
      <PageHeader title="Register a building and its energy asset" sub="Start with the Digital Postcode. Everything else hangs off it." />
      <Pipeline summary={data.summary} navigate={navigate} active={asset ? 'asset' : building ? 'building' : 'postcode'} />

      <ol className="steps" aria-label="Registration progress">
        {['Enter postcode', 'Confirm building', 'Register energy asset'].map((t, i) => (
          <li key={t} className={step > i + 1 || (asset && i === 2) ? 'done' : step === i + 1 ? 'cur' : ''} aria-current={step === i + 1 ? 'step' : undefined}>
            <span>{step > i + 1 || (asset && i === 2) ? <Icon name="check" size={14} /> : i + 1}</span>{t}
          </li>
        ))}
      </ol>

      <section className="card" aria-labelledby="s1">
        <h2 id="s1">1 · Digital Postcode lookup</h2>
        <form onSubmit={onLookup} className="lookup" noValidate>
          <div className="field grow">
            <label htmlFor="pc">Nigerian Digital Postcode</label>
            <input id="pc" className="pc-input" value={pc} onChange={(e) => setPc(e.target.value.toUpperCase())} placeholder="e.g. LG5-7TQ-2M9" autoComplete="off" spellCheck={false} aria-invalid={lookup.status === 'error'} aria-describedby={lookup.status === 'error' ? 'pc-err' : 'pc-help'} />
          </div>
          <button className="btn btn-primary" disabled={lookup.status === 'loading' || !pc.trim()}>
            {lookup.status === 'loading' ? 'Locating…' : 'Locate building'}
          </button>
        </form>
        <p id="pc-help" className="muted small">
          {config.mode === 'demo' ? 'DEMO MODE: only built-in test postcodes resolve. These are fictional and not issued by NIPOST.' : 'Looked up through the official NIPOST Digital Postcode API.'}
        </p>
        {config.mode === 'demo' && (
          <div className="chips" aria-label="Test postcodes">
            {config.demoPostcodes.filter((p) => !data.buildings.some((b) => b.postcode === p.postcode)).map((p) => (
              <button key={p.postcode} type="button" className="chip" onClick={() => { setPc(p.postcode); doLookup(p.postcode).catch(() => {}); }}>
                <span className="mono">{p.postcode}</span> {p.area}
              </button>
            ))}
          </div>
        )}
        <div aria-live="polite">
          {lookup.status === 'error' && (
            <div id="pc-err" className="notice err" role="alert">
              {lookup.message}
              {lookup.suggestions && <> Try one of the test postcodes above.</>}
            </div>
          )}
          {lookup.status === 'ok' && lookup.warning && <div className="notice warn">{lookup.warning}</div>}
        </div>
      </section>

      {record && (
        <section className="card building" aria-labelledby="s2">
          <div className="card-head">
            <h2 id="s2">2 · Building profile</h2>
            <SourceBadge source={lookup.source} />
          </div>
          <div className="bp">
            <div className="bp-code">
              <small>Digital Postcode</small>
              <PostcodeTag code={record.postcode} size="lg" />
            </div>
            <dl className="dl">
              <div><dt>Address / location</dt><dd>{record.address || <em>Not provided by API</em>}</dd></div>
              <div><dt>State</dt><dd>{record.state || <em>Not provided</em>}</dd></div>
              <div><dt>LGA</dt><dd>{record.lga || <em>Not provided</em>}</dd></div>
              <div><dt>GPS coordinates</dt><dd className="mono">{record.lat != null && record.lng != null ? `${record.lat.toFixed(4)}, ${record.lng.toFixed(4)}` : <em>Not available</em>}</dd></div>
              <div><dt>Building ID</dt><dd className="mono">{building ? <b>{building.id}</b> : <em>Assigned on registration</em>}</dd></div>
            </dl>
          </div>
          {lookup.existingBuilding && !building && <div className="notice">This postcode is already registered as <b className="mono">{lookup.existingBuilding.id}</b>. You can add another asset to it.</div>}
          {!building ? (
            <button className="btn btn-primary" onClick={onRegisterBuilding} disabled={busy}>{busy ? 'Registering…' : lookup.existingBuilding ? 'Use this building' : 'Register building'}</button>
          ) : (
            <div className="notice ok" role="status">Building identity anchored on <b className="mono">{building.postcode}</b> as <b className="mono">{building.id}</b>.</div>
          )}
        </section>
      )}

      {building && !asset && (
        <section className="card" aria-labelledby="s3">
          <div className="card-head">
            <h2 id="s3">3 · Register energy asset</h2>
            {config.mode === 'demo' && <button className="link" type="button" onClick={fillDemo}>Fill demo values</button>}
          </div>
          <form onSubmit={onRegisterAsset} noValidate className="form-grid">
            <Field id="f-bld" label="Building / Postcode">
              <input id="f-bld" value={`${building.postcode} · ${building.id}`} readOnly className="mono ro" />
            </Field>
            <Field id="f-id" label="Asset ID" hint="Leave blank to auto-generate (PX-AST-####)">
              <input id="f-id" value={form.id} onChange={set('id')} placeholder="PX-AST-####" autoComplete="off" />
            </Field>
            <Field id="f-type" label="Asset type">
              <select id="f-type" value={form.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <Field id="f-status" label="Current status">
              <select id="f-status" value={form.status} onChange={set('status')}><option>Online</option><option>Offline</option></select>
            </Field>
            {showSolar && <Field id="f-solar" label="Solar capacity (kW)" error={errors.solarKw}><input id="f-solar" type="number" min="0" step="0.1" inputMode="decimal" value={form.solarKw} onChange={set('solarKw')} aria-invalid={!!errors.solarKw} aria-describedby={errors.solarKw ? 'f-solar-e' : undefined} /></Field>}
            {showInv && <Field id="f-inv" label="Inverter capacity (kW)" error={errors.inverterKw}><input id="f-inv" type="number" min="0" step="0.1" inputMode="decimal" value={form.inverterKw} onChange={set('inverterKw')} aria-invalid={!!errors.inverterKw} aria-describedby={errors.inverterKw ? 'f-inv-e' : undefined} /></Field>}
            {showBat && <Field id="f-bat" label="Battery capacity (kWh)" error={errors.batteryKwh}><input id="f-bat" type="number" min="0" step="0.1" inputMode="decimal" value={form.batteryKwh} onChange={set('batteryKwh')} aria-invalid={!!errors.batteryKwh} aria-describedby={errors.batteryKwh ? 'f-bat-e' : undefined} /></Field>}
            <Field id="f-date" label="Installation date" error={errors.installDate}><input id="f-date" type="date" max={todayISO()} value={form.installDate} onChange={set('installDate')} aria-invalid={!!errors.installDate} aria-describedby={errors.installDate ? 'f-date-e' : undefined} /></Field>
            <Field id="f-inst" label="Installer" error={errors.installer}><input id="f-inst" value={form.installer} onChange={set('installer')} placeholder="e.g. SunVolt Nigeria" aria-invalid={!!errors.installer} aria-describedby={errors.installer ? 'f-inst-e' : undefined} /></Field>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Registering…' : 'Register energy asset'}</button>
            </div>
          </form>
          <div aria-live="polite">{msg && <div className="notice err" role="alert">{msg}</div>}</div>
        </section>
      )}

      {!building && msg && <div className="notice err" role="alert">{msg}</div>}

      {asset && building && (
        <section className="card success" aria-labelledby="s4">
          <h2 id="s4"><Icon name="check" /> Energy asset registered</h2>
          <p className="muted">Identity chain created. This asset is now locatable, monitorable and serviceable by its postcode.</p>
          <div className="chain">
            <PostcodeTag code={building.postcode} />
            <Icon name="arrow" size={14} /><span className="mono">{building.id}</span>
            <Icon name="arrow" size={14} /><span className="mono"><b>{asset.id}</b></span>
          </div>
          <p>{asset.type} · {capacityText(asset)} · {locationText(building)}</p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => navigate(`#/map/${asset.id}`)}>View on map</button>
            <button className="btn" onClick={() => navigate(`#/assets/${asset.id}`)}>Open asset</button>
            <button className="btn" onClick={() => { reg.reset(); setForm(emptyForm()); }}>Register another</button>
          </div>
        </section>
      )}
    </>
  );
}
