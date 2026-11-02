import { useEffect, useState } from 'react';
import { api } from '../api';
import { isoDaysAgo } from '../utils';
import { Icon } from './ui';

// Guided 3-minute scenario. Each button performs the real action (real API calls, real UI state),
// so the audience sees the product working rather than a slideshow.
export const STEPS = [
  {
    title: 'The 30-second message',
    show: 'Overview hero + the six-step chain',
    say: 'GPS PowerX gives distributed energy assets a digital identity tied to Nigeria’s Digital Postcode, so energy infrastructure is easier to locate, monitor, maintain and scale.',
    cta: 'Reset data & begin',
    run: async (c) => {
      await api.resetDemo();
      c.reg.reset();
      await c.refresh();
      c.navigate('#/');
    },
  },
  {
    title: '1 · Enter the Digital Postcode',
    show: 'Register page → postcode field',
    say: 'An installer has just commissioned a hybrid solar system. They enter the building’s Digital Postcode.',
    cta: 'Look up postcode',
    run: async (c) => {
      c.reg.setPc(c.config.scenario.postcode);
      c.navigate('#/register');
      await c.reg.doLookup(c.config.scenario.postcode);
    },
  },
  {
    title: '2 · Locate the building',
    show: 'Building profile: address, State, LGA, GPS',
    say: 'The postcode resolves to an exact address, LGA and coordinates. GPS PowerX anchors a permanent Building ID on it.',
    cta: 'Register building',
    run: async (c) => {
      const b = await c.reg.registerBuilding();
      c.setDemo((d) => ({ ...d, buildingId: b.id }));
    },
  },
  {
    title: '3 · Register the energy asset',
    show: 'Asset form + success card',
    say: 'The solar, inverter and battery are registered as one hybrid asset, linked to the building, not to a vague address.',
    cta: 'Register energy asset',
    run: async (c) => {
      const s = c.config.scenario.asset;
      const a = await c.reg.registerAsset({ ...s, installDate: isoDaysAgo(s.installDaysAgo) });
      c.setDemo((d) => ({ ...d, assetId: a.id }));
    },
  },
  {
    title: '4 · See it on the map',
    show: 'Map zooms to the new asset',
    say: 'The asset now appears geographically. Clicking it shows the building, postcode and energy information.',
    cta: 'Show on map',
    run: (c) => c.navigate(`#/map/${c.demo.assetId}`),
  },
  {
    title: '5 · Monitor the asset',
    show: 'Asset page: health score, simulated sensors',
    say: 'It is healthy. Sensor readings here are simulated: no IoT hardware is connected in this MVP.',
    cta: 'Open monitoring',
    run: (c) => c.navigate(`#/assets/${c.demo.assetId}`),
  },
  {
    title: '6 · Abnormal performance detected',
    show: 'Health score drops, anomaly alert appears',
    say: 'Output drops about 50% below expected. Our rule-based analytics flag it and raise the maintenance priority.',
    cta: 'Simulate abnormal performance',
    run: async (c) => {
      await api.triggerAnomaly(c.demo.assetId);
      await c.refresh();
    },
  },
  {
    title: '7 · Dispatch maintenance',
    show: 'Service request with postcode + location',
    say: 'The request carries the Digital Postcode and exact location, so the technician goes to the right building first time.',
    cta: 'Create maintenance request',
    run: async (c) => {
      await api.createRequest({
        assetId: c.demo.assetId,
        problem: c.config.scenario.problem,
        priority: 'High',
        technicianId: c.config.scenario.technicianId,
      });
      await c.refresh();
      c.navigate('#/service');
    },
  },
  {
    title: '8 · Intelligence across the portfolio',
    show: 'AI Insights: priority queue + deployment opportunities',
    say: 'Because every asset has a postcode identity, we can plan fleets, service coverage and where to deploy next.',
    cta: 'Show insights',
    run: (c) => c.navigate('#/insights'),
  },
];

function useElapsed(startedAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function PitchDemo({ demo, setDemo, ctx }) {
  const elapsed = useElapsed(demo.startedAt);
  const step = STEPS[demo.step];
  const done = demo.step >= STEPS.length;

  const exit = () => setDemo({ active: false, step: 0, busy: false, error: null, buildingId: null, assetId: null, startedAt: null });

  const next = async () => {
    setDemo((d) => ({ ...d, busy: true, error: null }));
    try {
      await step.run({ ...ctx, demo, setDemo });
      setDemo((d) => ({ ...d, busy: false, step: d.step + 1 }));
    } catch (e) {
      setDemo((d) => ({ ...d, busy: false, error: e.message }));
    }
  };

  return (
    <aside className="demo-panel" aria-label="Pitch Demo guide">
      <div className="demo-top">
        <span className="demo-tag"><Icon name="play" size={12} /> PITCH DEMO · {elapsed}</span>
        <button className="icon-btn" onClick={exit} aria-label="Exit pitch demo"><Icon name="close" size={16} /></button>
      </div>
      {done ? (
        <>
          <h2>Demo complete</h2>
          <p className="demo-say">Postcode → Building → Asset → Service → Intelligence: one identity chain for every building-level energy asset.</p>
          <div className="demo-actions">
            <button className="btn btn-primary" onClick={() => setDemo({ active: true, step: 0, busy: false, error: null, buildingId: null, assetId: null, startedAt: Date.now() })}>Run again</button>
            <button className="btn" onClick={exit}>Exit</button>
          </div>
        </>
      ) : (
        <>
          <div className="demo-progress" aria-hidden="true">
            {STEPS.map((_, i) => <i key={i} className={i < demo.step ? 'done' : i === demo.step ? 'cur' : ''} />)}
          </div>
          <h2>{step.title}</h2>
          <p className="demo-say"><span>Say:</span> {step.say}</p>
          <p className="demo-show"><span>On screen:</span> {step.show}</p>
          <div aria-live="polite">{demo.error && <p className="demo-error">{demo.error}</p>}</div>
          <div className="demo-actions">
            <button className="btn btn-primary" onClick={next} disabled={demo.busy}>
              {demo.busy ? 'Working…' : step.cta} {!demo.busy && <Icon name="arrow" size={16} />}
            </button>
            <span className="muted small">Step {demo.step + 1} of {STEPS.length}</span>
          </div>
        </>
      )}
    </aside>
  );
}
