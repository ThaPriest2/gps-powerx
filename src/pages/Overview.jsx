import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import Pipeline from '../components/Pipeline';
import MapView from '../components/MapView';
import { Icon, PostcodeTag, PriorityBadge, Empty } from '../components/ui';
import { fmt, PRIORITY_RANK } from '../utils';

const STATUS_COLORS = { Online: '#16a34a', Degraded: '#d97706', Offline: '#dc2626' };

function Stat({ label, value, sub, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export default function Overview({ data, navigate, startDemo, config }) {
  const s = data.summary;
  const alerts = data.assets
    .filter((a) => a.analysis.needsMaintenance)
    .sort((a, b) => PRIORITY_RANK[a.analysis.priority] - PRIORITY_RANK[b.analysis.priority])
    .slice(0, 4);
  const statusData = [
    { name: 'Online', value: s.online },
    { name: 'Degraded', value: s.degraded },
    { name: 'Offline', value: s.offline },
  ].filter((d) => d.value > 0);

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">Built on Nigeria’s Postcode</span>
          <h1 id="hero-title" tabIndex={-1}>GPS PowerX<span>Postcode-Powered Energy Infrastructure</span></h1>
          <p className="hero-lead">
            Every solar system, inverter and battery gets a <b>digital identity tied to Nigeria’s Digital Postcode</b>, so building-level energy infrastructure is easier to locate, monitor, maintain and scale.
          </p>
          <p className="hero-tag">Powering Every Building, Precisely.</p>
          <div className="hero-cta">
            <button className="btn btn-amber btn-lg" onClick={startDemo}><Icon name="play" size={14} /> Start 3-minute Pitch Demo</button>
            <button className="btn btn-ghost btn-lg" onClick={() => navigate('#/register')}>Register a building</button>
          </div>
        </div>
        <div className="hero-card" aria-label="Example identity chain">
          <span className="hc-label">Identity chain</span>
          <PostcodeTag code={data.buildings[0]?.postcode || 'XXX-XXX-XXX'} size="lg" />
          <ol className="hc-chain">
            <li><small>Building ID</small><b>{data.buildings[0]?.id}</b></li>
            <li><small>Asset ID</small><b>{data.assets[0]?.id}</b></li>
            <li><small>Service</small><b>Routed by postcode</b></li>
          </ol>
          {config.mode === 'demo' && <span className="badge src-demo">DEMO · test postcode</span>}
        </div>
      </section>

      <Pipeline summary={s} navigate={navigate} />

      <section className="grid stats" aria-label="Key figures">
        <Stat label="Buildings" value={s.buildings} sub={`${s.states} states`} />
        <Stat label="Energy assets" value={s.assets} sub={`${s.openRequests} open service requests`} />
        <Stat label="Installed capacity" value={`${fmt(s.solarKw)} kW`} sub={`solar · ${fmt(s.batteryKwh)} kWh battery`} />
        <Stat label="Online systems" value={`${s.online}/${s.assets}`} sub={`${s.degraded} degraded · ${s.offline} offline`} tone="ok" />
        <Stat label="Maintenance alerts" value={s.needsMaintenance} sub="rule-based, simulated sensors" tone={s.needsMaintenance ? 'warn' : ''} />
        <Stat label="Avg. health score" value={s.avgHealth} sub="0–100 · demo analytics" />
      </section>

      <section className="grid two" aria-label="Geographic distribution">
        <div className="card">
          <div className="card-head">
            <h2>Geographic distribution</h2>
            <button className="link" onClick={() => navigate('#/map')}>Open full map →</button>
          </div>
          <MapView assets={data.assets} onSelect={(id) => navigate(`#/map/${id}`)} height={320} label="Overview map of registered energy assets" />
        </div>
        <div className="card">
          <h2>Capacity by state</h2>
          <div className="chart" role="img" aria-label="Bar chart of solar kilowatts and battery kilowatt-hours by state">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={s.byState} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e9e5" />
                <XAxis dataKey="state" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="solarKw" name="Solar (kW)" fill="#13774f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="batteryKwh" name="Battery (kWh)" fill="#f5b301" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid two" aria-label="Status and alerts">
        <div className="card">
          <h2>System status</h2>
          <div className="donut-row">
            <div className="chart" style={{ width: 170 }} role="img" aria-label={`Status: ${s.online} online, ${s.degraded} degraded, ${s.offline} offline`}>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {statusData.map((d) => <Cell key={d.name} fill={STATUS_COLORS[d.name]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="legend">
              {['Online', 'Degraded', 'Offline'].map((k) => (
                <li key={k}><i style={{ background: STATUS_COLORS[k] }} />{k}<b>{s[k.toLowerCase()]}</b></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h2>Maintenance alerts</h2>
            <button className="link" onClick={() => navigate('#/insights')}>AI Insights →</button>
          </div>
          {alerts.length === 0 ? (
            <Empty title="No active alerts">All registered systems are healthy.</Empty>
          ) : (
            <ul className="alert-list">
              {alerts.map((a) => (
                <li key={a.id}>
                  <button onClick={() => navigate(`#/assets/${a.id}`)}>
                    <PostcodeTag code={a.building.postcode} size="sm" />
                    <span className="al-main"><b>{a.id}</b><small>{a.analysis.anomalies[0]?.label || a.analysis.recommendedAction}</small></span>
                    <PriorityBadge priority={a.analysis.priority} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="why" aria-labelledby="why-title">
        <h2 id="why-title">Why it matters</h2>
        <div className="grid three">
          <article className="card why-card">
            <span className="why-n">The problem</span>
            <p>Distributed energy systems are difficult to identify, manage and service at scale. Technicians search for vague addresses; owners and financiers cannot see what is installed where.</p>
          </article>
          <article className="card why-card accent">
            <span className="why-n">The solution</span>
            <p>GPS PowerX connects each energy asset to a standardized Nigerian Digital Postcode, giving every building and every system one precise, shared identity.</p>
          </article>
          <article className="card why-card">
            <span className="why-n">The impact</span>
            <p>Better asset management, faster field service, better maintenance, and smarter energy deployment decisions.</p>
          </article>
        </div>
      </section>

      <section className="card diff" aria-labelledby="diff-title">
        <h2 id="diff-title">Not grid mapping. Building-level energy assets.</h2>
        <div className="table-wrap">
          <table>
            <caption className="sr">Comparison of grid-mapping tools and GPS PowerX</caption>
            <thead>
              <tr><th scope="col" /><th scope="col">Typical grid / network mapping</th><th scope="col" className="us">GPS PowerX</th></tr>
            </thead>
            <tbody>
              <tr><th scope="row">Unit of focus</th><td>Lines, feeders, substations</td><td className="us">Solar, inverters, batteries and hybrid systems inside buildings</td></tr>
              <tr><th scope="row">Identity</th><td>Network node IDs</td><td className="us">Digital Postcode → Building ID → Asset ID</td></tr>
              <tr><th scope="row">Who acts</th><td>Utilities and regulators</td><td className="us">Installers, technicians, owners, financiers</td></tr>
              <tr><th scope="row">Outcome</th><td>Network visibility</td><td className="us">Locate, monitor, service and plan deployment</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
