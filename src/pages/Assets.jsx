import { useState } from 'react';
import { PageHeader, PostcodeTag, StatusBadge, HealthRing, ServiceDue, Empty } from '../components/ui';
import { capacityText, locationText } from '../utils';

export default function Assets({ data, navigate }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('All');

  const rows = data.assets.filter((a) => {
    const text = `${a.id} ${a.building.postcode} ${a.building.area} ${a.building.lga} ${a.building.state} ${a.installer}`.toLowerCase();
    return text.includes(q.toLowerCase()) && (status === 'All' || a.analysis.status === status) && (type === 'All' || a.type === type);
  });

  return (
    <>
      <PageHeader title="Energy assets" sub={`${data.assets.length} building-level systems, each identified by Digital Postcode.`}>
        <button className="btn btn-primary" onClick={() => navigate('#/register')}>Register asset</button>
      </PageHeader>

      <div className="card">
        <div className="filters">
          <div className="field grow">
            <label htmlFor="q">Search postcode, asset, area or installer</label>
            <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. LG5 or Lekki" />
          </div>
          <div className="field">
            <label htmlFor="fs">Status</label>
            <select id="fs" value={status} onChange={(e) => setStatus(e.target.value)}>{['All', 'Online', 'Degraded', 'Offline'].map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div className="field">
            <label htmlFor="ft">Type</label>
            <select id="ft" value={type} onChange={(e) => setType(e.target.value)}>{['All', 'Solar', 'Inverter', 'Battery', 'Hybrid System'].map((s) => <option key={s}>{s}</option>)}</select>
          </div>
        </div>

        {rows.length === 0 ? (
          <Empty title="No assets match" action={<button className="btn" onClick={() => { setQ(''); setStatus('All'); setType('All'); }}>Clear filters</button>}>
            Try a different search or clear the filters.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="clickable">
              <caption className="sr">Registered energy assets</caption>
              <thead>
                <tr>
                  <th scope="col">Digital Postcode</th><th scope="col">Asset</th><th scope="col">Location</th><th scope="col">Type · capacity</th>
                  <th scope="col">Status</th><th scope="col">Health</th><th scope="col">Next service</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td><PostcodeTag code={a.building.postcode} size="sm" /></td>
                    <td><a className="mono strong" href={`#/assets/${a.id}`} onClick={(e) => { e.preventDefault(); navigate(`#/assets/${a.id}`); }}>{a.id}</a></td>
                    <td>{locationText(a.building)}</td>
                    <td><b>{a.type}</b><br /><small className="muted">{capacityText(a)}</small></td>
                    <td><StatusBadge status={a.analysis.status} /></td>
                    <td><HealthRing score={a.analysis.healthScore} size={40} /></td>
                    <td><ServiceDue days={a.analysis.nextServiceInDays} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
