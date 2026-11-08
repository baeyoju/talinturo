import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatCard } from "@/components/ui/StatCard";

export function LearnerDetailsPage() {
  const { id } = useParams();
  const [learner, setLearner] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    setLearner(null);
    setEvents([]);
    setLoadError("");
    api(`/instructor/learners/${id}`)
      .then((result) => {
        if (!active) return;
        setLearner(result.learner);
        setEvents(result.events || []);
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      });
    return () => { active = false; };
  }, [id]);

  if (loadError) return <><PageTitle eyebrow="LEARNER PROFILE" title="Learner details" /><p className="inline-error">Could not load this learner: {loadError}</p></>;
  if (!learner) return <div className="empty-state">Loading learner details…</div>;

  const initials = learner.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return <><PageTitle eyebrow="LEARNER PROFILE" title={learner.name} description={`A closer look at ${learner.name.split(" ")[0]}'s learning journey.`} action={<span className="soft-tag">CLASSROOM LEARNER</span>} /><div className="learner-detail-hero panel"><span className="avatar avatar-large avatar-mint">{initials}</span><div><h2>{learner.name}</h2><p>{learner.level} level · Joined through your classroom</p></div><Button variant="outline" onClick={() => window.print()}>↓ Export summary</Button></div><div className="stats-grid"><StatCard icon="bookOpen" tone="lavender" label="Completed activities" value={learner.activities} change="Since joining" /><StatCard icon="hand" tone="peach" label="Practice accuracy" value={learner.accuracy == null ? "—" : `${learner.accuracy}%`} change="Across completed activities" /><StatCard icon="sun" tone="yellow" label="Last active" value={learner.last_active ? new Date(learner.last_active).toLocaleDateString() : "—"} change={learner.last_active ? new Date(learner.last_active).toLocaleTimeString() : "No completed activity yet"} /><StatCard icon="sprout" tone="mint" label="Current level" value={learner.level} change="Based on completed activity accuracy" /></div><div className="progress-content-grid"><section className="panel"><p className="eyebrow">GROWING EVERY WEEK</p><h2>Recent activity</h2>{events.length ? <div className="timeline">{events.map((event, index) => <div key={`${event.activity}-${event.created_at}-${index}`}><i className={`timeline-dot ${["mint", "peach", "lavender"][index % 3]}`} /><span><strong>{event.activity} · {event.score}%</strong><small>{new Date(event.created_at).toLocaleString()}</small></span></div>)}</div> : <p>No completed activities yet. Their progress will appear here as they practice.</p>}</section><section className="panel"><p className="eyebrow">A LITTLE ENCOURAGEMENT</p><h2>Strengths & next steps</h2><div className="insight-row"><Icon name="star" size={20} /><div><strong>Keep celebrating each try</strong><small>Consistent practice helps build confidence.</small></div></div><div className="insight-row"><Icon name="sprout" size={20} /><div><strong>Explore a new sign together</strong><small>Small steps make a meaningful difference.</small></div></div></section></div></>;
}
