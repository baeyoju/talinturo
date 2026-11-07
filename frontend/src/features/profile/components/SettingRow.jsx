export function SettingRow({ title, text, checked, onChange }) {
  return <div className="setting-row"><div><strong>{title}</strong><small>{text}</small></div><button className={`switch ${checked ? "switch-on" : ""}`} role="switch" aria-checked={checked} aria-label={title} onClick={onChange}><span /></button></div>;
}
