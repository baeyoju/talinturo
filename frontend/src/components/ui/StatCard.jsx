import { Icon } from "./Icon";

export function StatCard({ icon, tone, label, value, change }) {
  return <div className="stat-card"><span className={`stat-icon ${tone}`}><Icon name={icon} size={21} /></span><div className="stat-copy"><small>{label}</small><strong>{value}</strong><span>{change}</span></div><span className="stat-menu">···</span></div>;
}
