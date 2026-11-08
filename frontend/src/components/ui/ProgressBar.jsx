export function ProgressBar({ value, color = "green" }) {
  return <div className={`progress-track progress-${color}`}><span style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}
