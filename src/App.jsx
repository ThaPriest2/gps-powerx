import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { useRegistration } from './useRegistration';
import { Icon, Loading, ErrorBox } from './components/ui';
import PitchDemo from './components/PitchDemo';
import Overview from './pages/Overview';
import Register from './pages/Register';
import MapPage from './pages/MapPage';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import Service from './pages/Service';
import Insights from './pages/Insights';

const NAV = [
  { page: 'overview', to: '#/', label: 'Overview', icon: 'overview' },
  { page: 'register', to: '#/register', label: 'Register', icon: 'pin' },
  { page: 'map', to: '#/map', label: 'Map', icon: 'map' },
  { page: 'assets', to: '#/assets', label: 'Assets', icon: 'bolt' },
  { page: 'service', to: '#/service', label: 'Technician', icon: 'wrench' },
  { page: 'insights', to: '#/insights', label: 'AI Insights', icon: 'spark' },
];

function useRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [path, qs] = hash.slice(1).split('?');
  const parts = path.split('/').filter(Boolean);
  return { page: parts[0] || 'overview', param: parts[1] ? decodeURIComponent(parts[1]) : null, query: new URLSearchParams(qs || '') };
}

export default function App() {
  const route = useRoute();
  const [boot, setBoot] = useState({ status: 'loading' });
  const [stale, setStale] = useState(false);
  const mainRef = useRef(null);

  const navigate = useCallback((to) => {
    window.location.hash = to;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api.state();
      setBoot((b) => (b.status === 'ok' ? { ...b, data } : b));
      setStale(false);
      return data;
    } catch {
      setStale(true);
      return null;
    }
  }, []);

  const load = useCallback(async () => {
    setBoot({ status: 'loading' });
    try {
      const [config, data] = await Promise.all([api.config(), api.state()]);
      setBoot({ status: 'ok', config, data });
    } catch (e) {
      setBoot({ status: 'error', message: e.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (boot.status !== 'ok') return undefined;
    const t = setInterval(() => {
      if (!document.hidden) refresh();
    }, 6000);
    return () => clearInterval(t);
  }, [boot.status, refresh]);

  const reg = useRegistration(refresh);
  const [demo, setDemo] = useState({ active: false, step: 0, busy: false, error: null, buildingId: null, assetId: null, startedAt: null });

  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [route.page, route.param]);

  const startDemo = () => {
    setDemo({ active: true, step: 0, busy: false, error: null, buildingId: null, assetId: null, startedAt: Date.now() });
    navigate('#/');
  };

  const resetData = async () => {
    await api.resetDemo();
    reg.reset();
    await refresh();
  };

  let body;
  if (boot.status === 'loading') body = <Loading label="Starting GPS PowerX…" />;
  else if (boot.status === 'error') body = <ErrorBox message={boot.message} onRetry={load} />;
  else {
    const ctx = { data: boot.data, config: boot.config, refresh, navigate, reg, route, startDemo, resetData };
    const pages = {
      overview: <Overview {...ctx} />,
      register: <Register {...ctx} />,
      map: <MapPage {...ctx} />,
      assets: route.param ? <AssetDetail {...ctx} /> : <Assets {...ctx} />,
      service: <Service {...ctx} />,
      insights: <Insights {...ctx} />,
    };
    body = pages[route.page] || pages.overview;
  }

  const demoMode = boot.status === 'ok' ? boot.config.mode === 'demo' : null;
  const ctxForDemo = boot.status === 'ok' ? { config: boot.config, reg, refresh, navigate } : null;

  return (
    <div className="app">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>Skip to content</a>

      <aside className="sidebar">
        <a className="brand" href="#/" onClick={(e) => { e.preventDefault(); navigate('#/'); }} aria-label="GPS PowerX home">
          <span className="brand-mark"><Icon name="bolt" size={18} /></span>
          <span>
            <b>GPS PowerX</b>
            <small>Powering Every Building, Precisely.</small>
          </span>
        </a>
        <nav aria-label="Main">
          {NAV.map((n) => (
            <a key={n.page} href={n.to} className={route.page === n.page ? 'active' : ''} aria-current={route.page === n.page ? 'page' : undefined} onClick={(e) => { e.preventDefault(); navigate(n.to); }}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <button className="btn btn-amber btn-block" onClick={startDemo} disabled={boot.status !== 'ok'}>
            <Icon name="play" size={14} /> Start Pitch Demo
          </button>
          <p>Built on Nigeria’s Postcode</p>
        </div>
      </aside>

      <div className="content">
        <div className={`modebar ${demoMode === false ? 'live' : ''}`} role="status">
          {demoMode === null ? 'Connecting…' : demoMode ? (
            <><strong>DEMO MODE</strong> — Using test postcode data. Not live NIPOST data. Sensor readings are simulated.</>
          ) : (
            <><strong>LIVE</strong> — NIPOST Digital Postcode API connected. Sensor readings are simulated (no IoT hardware connected).</>
          )}
          {stale && <span className="stale"> · Reconnecting…</span>}
          <button className="modebar-btn" onClick={startDemo} disabled={boot.status !== 'ok'}>▶ Pitch Demo</button>
        </div>
        <main id="main" ref={mainRef} tabIndex={-1} className="main">
          {body}
        </main>
      </div>

      <nav className="tabbar" aria-label="Main (mobile)">
        {NAV.map((n) => (
          <a key={n.page} href={n.to} className={route.page === n.page ? 'active' : ''} aria-current={route.page === n.page ? 'page' : undefined} onClick={(e) => { e.preventDefault(); navigate(n.to); }}>
            <Icon name={n.icon} size={20} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>

      {demo.active && ctxForDemo && <PitchDemo demo={demo} setDemo={setDemo} ctx={ctxForDemo} />}
    </div>
  );
}
