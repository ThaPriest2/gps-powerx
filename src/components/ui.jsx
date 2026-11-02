import { daysLabel } from './helpers';

const PATHS = {
  pin: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  overview: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  building: 'M5 21V4l9-2v19M14 9h5v12M3 21h18M9 8h1M9 12h1M9 16h1',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.3-.6-.6-2.3z',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  play: 'M7 4l13 8-13 8z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 12l5 5 9-10',
  close: 'M6 6l12 12M18 6L6 18',
};

export function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function PostcodeTag({ code, size = 'md' }) {
  return (
    <span className={`pcode pcode-${size}`} title="NIPOST Digital Postcode">
      <Icon name="pin" size={size === 'lg' ? 22 : 14} />
      <span>{code}</span>
    </span>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge st-${status.toLowerCase()}`}><i aria-hidden="true" />{status}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`badge pr-${priority.toLowerCase()}`}>{priority}</span>;
}

export function SourceBadge({ source }) {
  if (source === 'live') return <span className="badge src-live">LIVE · NIPOST API</span>;
  if (source === 'demo-fallback') return <span className="badge src-demo">TEST DATA · live API unavailable</span>;
  return <span className="badge src-demo">DEMO · test postcode data</span>;
}

export function SimTag({ children = 'SIMULATED DATA' }) {
  return <span className="badge sim">{children}</span>;
}

export function HealthRing({ score, size = 76 }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? 'var(--ok)' : score >= 60 ? 'var(--warn)' : 'var(--bad)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Energy health score ${score} out of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size / 3.2} fontWeight="800" fill="var(--ink)">{score}</text>
    </svg>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <strong>Something went wrong</strong>
      <p>{message}</p>
      {onRetry && <button className="btn" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="state">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, sub, children }) {
  return (
    <header className="page-head">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function ServiceDue({ days }) {
  const cls = days < 0 ? 'bad' : days <= 14 ? 'warn' : '';
  return <span className={`due ${cls}`}>{daysLabel(days)}</span>;
}
