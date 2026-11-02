import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import Pipeline from '../components/Pipeline';
import { PageHeader, PostcodeTag, PriorityBadge, HealthRing, SimTag, Empty } from '../components/ui';
import { PRIORITY_RANK, locationText } from '../utils';

const PR_COLORS = { Critical: '#b91c1c', High: '#dc2626', Medium: '#d97706', Low: '#16a34a' };

export default function Insights({ data, config, navigate }) {
  const s = data.summary;
  const queue = [...data.assets].sort((a, b) => PRIORITY_RANK[a.analysis.priority] - PRIORITY_RANK[b.analysis.priority] || a.analysis.healthScore - b.analysis.healthScore);
  const anomalies = data.assets.filter((a) => a.analysis.anomalies.length > 0);

  return (
    <>
      <PageHeader title="AI Insights" sub="Asset health, maintenance priority and deployment opportunities, across every postcode-identified asset.">
        <SimTag>SIMULATED SENSOR DATA</SimTag>
        <SimTag>RULE-BASED · NOT A TRAINED MODEL</SimTag>
      </PageHeader>
      <Pipeline summary={s} navigate={navigate} active="insight" />

      <section className="grid two">
        <div className="card">
          <h2>Maintenance priority mix</h2>
          <div className="chart" role="img" aria-label="Bar chart of assets by maintenance priority">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={s.byPriority} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e9e5" />
                <XAxis dataKey="priority" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Assets" radius={[4, 4, 0, 0]}>
                  {s.byPriority.map((d) => <Cell key={d.priority} fill={PR_COLORS[d.priority]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h2>Fleet health</h2>
          <div className="health-row">
            <HealthRing score={s.avgHealth} size={110} />
            <div>
              <p><b>{s.needsMaintenance}</b> of {s.assets} assets need attention.</p>
              <p className="muted small">Average of per-asset scores computed from performance ratio, temperatures and service dates.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="q-title">
        <h2 id="q-title">Maintenance priority queue</h2>
        <div className="table-wrap">
          <table>
            <caption className="sr">Assets ordered by maintenance priority</caption>
            <thead><tr><th scope="col">Priority</th><th scope="col">Digital Postcode</th><th scope="col">Asset</th><th scope="col">Health</th><th scope="col">Detected issue</th><th scope="col">Recommended action</th></tr></thead>
            <tbody>
              {queue.map((a) => (
                <tr key={a.id}>
                  <td><PriorityBadge priority={a.analysis.priority} /></td>
                  <td><PostcodeTag code={a.building.postcode} size="sm" /><br /><small className="muted">{locationText(a.building)}</small></td>
                  <td><a className="mono strong" href={`#/assets/${a.id}`} onClick={(e) => { e.preventDefault(); navigate(`#/assets/${a.id}`); }}>{a.id}</a></td>
                  <td><HealthRing score={a.analysis.healthScore} size={40} /></td>
                  <td>{a.analysis.anomalies[0]?.label || (a.analysis.serviceOverdue ? 'Service overdue' : '—')}</td>
                  <td>{a.analysis.recommendedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>Possible abnormal performance</h2>
          {anomalies.length === 0 ? <Empty title="No anomalies detected">All simulated readings are within thresholds.</Empty> : (
            <ul className="plain">
              {anomalies.map((a) => (
                <li key={a.id}>
                  <b className="mono">{a.id}</b> · {a.building.postcode}
                  {a.analysis.anomalies.map((x) => <p key={x.code} className="small"><b>{x.label}.</b> {x.detail}</p>)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="card-head"><h2>Future deployment opportunities</h2><SimTag>RULE-BASED</SimTag></div>
          {data.deployment.length === 0 ? <Empty title="No recommendations yet">Register more buildings to unlock portfolio insights.</Empty> : (
            <ul className="plain">
              {data.deployment.map((d) => (
                <li key={d.title}>
                  <span className="badge kind">{d.kind}</span> <b>{d.title}</b>
                  <p className="small">{d.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <details className="card rules">
        <summary>How these insights are calculated (transparent rules)</summary>
        <p className="muted small">No machine-learning model is used. Sensor inputs are simulated; the thresholds below are applied exactly as written.</p>
        <ul>{config.rules.map((r) => <li key={r.id}>{r.text}</li>)}</ul>
      </details>
    </>
  );
}
