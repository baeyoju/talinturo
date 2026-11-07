import { useEffect, useState } from "react";
import { api } from "@/adapters/http/api";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LearnerTable } from "../components/LearnerTable";

export function LearnersPage({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [roster, setRoster] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api("/instructor/learners").then((result) => setRoster(result.learners)).catch((error) => setLoadError(error.message)).finally(() => setLoading(false));
  }, []);
  const filtered = roster.filter((learner) => learner.name.toLowerCase().includes(search.toLowerCase()));
  return <><PageTitle eyebrow="HELP EVERY LEARNER SHINE" title="Learner management" description="Get to know your learners' progress, celebrate their wins, and find where they might need a hand." action={<Button onClick={() => onNavigate("/classrooms")}>＋ Add learners</Button>} /><section className="panel learner-management-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR LEARNERS</p><h2>{roster.length} learners</h2></div><label className="search-field compact-search"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a learner" /></label></div>{loadError && <p className="inline-error">Could not load learners: {loadError}</p>}{filtered.length > 0 && <LearnerTable rows={filtered} onNavigate={onNavigate} />}{loading && <div className="empty-table">Loading your learner roster…</div>}{!loading && !loadError && filtered.length === 0 && <div className="empty-table">{roster.length ? "No learners match that name." : "No active learners are connected to your classrooms yet."}</div>}<div className="table-footer"><span>Showing {filtered.length} of {roster.length} learners</span></div></section><div className="gentle-note"><Icon name="heart" size={18} /><span>Learner information is private to your classroom. Please handle it with care.</span></div></>;
}
