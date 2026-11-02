import { Icon } from './ui';

// The core story, always visible: Postcode → Building → Asset → Monitoring → Maintenance → Intelligence
export default function Pipeline({ summary, navigate, active }) {
  const s = summary;
  const nodes = [
    { key: 'postcode', icon: 'pin', title: 'Digital Postcode', sub: 'NIPOST address key', value: s ? `${s.buildings} postcodes` : '—', to: '#/register' },
    { key: 'building', icon: 'building', title: 'Building Identity', sub: 'Postcode-anchored ID', value: s ? `${s.buildings} Building IDs` : '—', to: '#/register' },
    { key: 'asset', icon: 'bolt', title: 'Energy Asset', sub: 'Solar · inverter · battery', value: s ? `${s.assets} assets` : '—', to: '#/assets' },
    { key: 'monitor', icon: 'map', title: 'Monitoring', sub: 'Map + live status', value: s ? `${s.online}/${s.assets} online` : '—', to: '#/map' },
    { key: 'service', icon: 'wrench', title: 'Maintenance', sub: 'Postcode-routed service', value: s ? `${s.openRequests} open requests` : '—', to: '#/service' },
    { key: 'insight', icon: 'spark', title: 'Intelligence', sub: 'Health & planning', value: s ? `${s.needsMaintenance} alerts` : '—', to: '#/insights' },
  ];
  return (
    <nav className="pipeline" aria-label="GPS PowerX value chain">
      <ol>
        {nodes.map((n, i) => (
          <li key={n.key} className={active === n.key ? 'on' : ''}>
            <a href={n.to} onClick={(e) => { e.preventDefault(); navigate(n.to); }}>
              <span className="pl-icon"><Icon name={n.icon} size={20} /></span>
              <span className="pl-title">{n.title}</span>
              <span className="pl-sub">{n.sub}</span>
              <span className="pl-val">{n.value}</span>
            </a>
            {i < nodes.length - 1 && <span className="pl-arrow" aria-hidden="true"><Icon name="arrow" size={16} /></span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
