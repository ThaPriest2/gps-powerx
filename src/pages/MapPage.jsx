import { useState } from 'react';
import MapView from '../components/MapView';
import { PageHeader, PostcodeTag, StatusBadge, PriorityBadge, HealthRing, SimTag, Empty } from '../components/ui';
import { capacityText, locationText, fmtDate } from '../utils';

export default function MapPage({ data, route, navigate }) {
  const [filter, setFilter] = useState('All');
  const selectedId = route.param;
  const assets = data.assets.filter((a) => filter === 'All' || a.analysis.status === filter);
  const sel = data.assets.find((a) => a.id === selectedId);
  const choose = (id) => navigate(`#/map/${id}`);

  return (
    <>
      <PageHeader title="Asset map" sub="Every registered energy asset, placed by its building’s Digital Postcode coordinates.">
        <div className="seg" role="group" aria-label="Filter by status">
          {['All', 'Online', 'Degraded', 'Offline'].map((f) => (
            <button key={f} className={filter === f ? 'on' : ''} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </PageHeader>

      {data.assets.length === 0 ? (
        <Empty title="No assets on the map yet" action={<button className="btn btn-primary" onClick={() => navigate('#/register')}>Register a building</button>}>
          Register a building by postcode, then add an energy asset to see it here.
        </Empty>
      ) : (
        <div className="map-layout">
          <div className="card flush">
            <MapView assets={assets} selectedId={selectedId} onSelect={choose} height={560} />
            <div className="map-legend" aria-hidden="true">
              <span><i style={{ background: '#16a34a' }} /> Online</span>
              <span><i style={{ background: '#d97706' }} /> Degraded</span>
              <span><i style={{ background: '#dc2626' }} /> Offline</span>
            </div>
          </div>
          <aside className="card detail-panel" aria-live="polite" aria-label="Selected asset">
            {!sel ? (
              <Empty title="Select an asset">Click a marker to see its building and energy information.</Empty>
            ) : (
              <>
                <PostcodeTag code={sel.building.postcode} size="lg" />
                <h2 className="mono">{sel.id}</h2>
                <div className="row"><StatusBadge status={sel.analysis.status} /><PriorityBadge priority={sel.analysis.priority} /></div>
                <dl className="dl compact">
                  <div><dt>Building ID</dt><dd className="mono">{sel.building.id}</dd></div>
                  <div><dt>Location</dt><dd>{sel.building.address}</dd></div>
                  <div><dt>LGA, State</dt><dd>{sel.building.lga}, {sel.building.state}</dd></div>
                  <div><dt>Type</dt><dd>{sel.type}</dd></div>
                  <div><dt>Capacity</dt><dd>{capacityText(sel)}</dd></div>
                  <div><dt>Next service</dt><dd>{fmtDate(sel.nextService)}</dd></div>
                </dl>
                <div className="row"><HealthRing score={sel.analysis.healthScore} size={64} /><div><b>Energy health</b><br /><SimTag /></div></div>
                <button className="btn btn-primary btn-block" onClick={() => navigate(`#/assets/${sel.id}`)}>Open asset details</button>
                <small className="muted">{locationText(sel.building)}</small>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
