import { Icon } from "@/components/ui/Icon";

export function DatabaseHelpNotice({ error }) {
  return <section className="database-help-notice panel" role="alert">
    <span className="database-help-icon"><Icon name="lifeBuoy" size={23} /></span>
    <div>
      <p className="eyebrow">CAN'T REACH THE LEARNING WORLD?</p>
      <h2>Check your database connection</h2>
      <p>{error}</p>
      <p>Open <strong>SETUP.md → Connect PostgreSQL</strong>. Set <code>DATABASE_URL</code> (and <code>PGHOST</code>, <code>PGPORT</code>, <code>PGDATABASE</code>, <code>PGUSER</code>, and <code>PGPASSWORD</code> if needed) in the same PowerShell window that runs Flask, then restart the backend.</p>
      <p>If Flask reports missing lesson columns, apply the updated <code>talinturo_database.sql</code> to your database.</p>
    </div>
  </section>;
}
