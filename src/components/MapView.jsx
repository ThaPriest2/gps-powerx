import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const COLORS = { Online: '#16a34a', Degraded: '#d97706', Offline: '#dc2626' };

export default function MapView({ assets, selectedId, onSelect, height = 440, label = 'Map of registered energy assets' }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const markers = useRef({});
  const onSelectRef = useRef(onSelect);
  const fitted = useRef('');
  onSelectRef.current = onSelect;

  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView([8.5, 7.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    const t = setTimeout(() => map.current?.invalidateSize(), 150);
    return () => {
      clearTimeout(t);
      map.current.remove();
      map.current = null;
    };
  }, []);

  const key = assets.map((a) => `${a.id}:${a.analysis.status}:${a.building?.lat}`).join('|') + `#${selectedId || ''}`;

  useEffect(() => {
    if (!map.current) return;
    layer.current.clearLayers();
    markers.current = {};
    const pts = [];
    assets.forEach((a) => {
      const b = a.building;
      if (b?.lat == null || b?.lng == null) return;
      const sel = a.id === selectedId;
      const icon = L.divIcon({
        className: 'px-marker-wrap',
        html: `<span class="px-marker ${sel ? 'sel' : ''}" style="--c:${COLORS[a.analysis.status]}"><i></i></span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const m = L.marker([b.lat, b.lng], { icon, title: `${a.id} · ${b.postcode} · ${a.analysis.status}`, keyboard: true }).addTo(layer.current);
      m.bindTooltip(b.postcode, { direction: 'top', offset: [0, -12] });
      m.on('click', () => onSelectRef.current?.(a.id));
      markers.current[a.id] = m;
      pts.push([b.lat, b.lng]);
    });
    const idsKey = assets.map((a) => a.id).join('|');
    if (!selectedId && pts.length && fitted.current !== idsKey) {
      map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 11 });
      fitted.current = idsKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const m = selectedId && markers.current[selectedId];
    if (m && map.current) map.current.flyTo(m.getLatLng(), 12, { duration: 0.8 });
  }, [selectedId]);

  return <div ref={el} className="map" style={{ height }} role="region" aria-label={label} />;
}
