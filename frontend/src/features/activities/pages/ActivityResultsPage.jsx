import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function ActivityResultsPage({ onNavigate }) {
  const [event, setEvent] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const { search } = useLocation();
  useEffect(() => {
    setEvent(null);
    setLoadError("");
    setLoading(true);
    const activityId = Number(new URLSearchParams(search).get("activity_id"));
    api("/progress")
      .then(({ events }) => setEvent(events.find((item) => item.activity_id === activityId) || events[0] || null))
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, [search]);
  if (loadError) return <p className="inline-error">{loadError}</p>;
  if (loading) return <div className="empty-state">Loading your result…</div>;
  if (!event) return <div className="empty-state"><h2>No completed activity found</h2><p>Finish a published scenario or practice activity to see its saved result here.</p><Button variant="outline" onClick={() => onNavigate("/scenarios")}>Choose a scenario</Button></div>;
  return <section className="result-card panel"><div className="result-confetti"><Icon name="sparkles" size={22} /></div><span className="result-icon"><Icon name="star" size={34} /></span><p className="eyebrow">ACTIVITY COMPLETE</p><h1>{event.activity}</h1><p>Your result has been saved to your learning history.</p><div className="result-stats"><div><strong>{event.score}%</strong><small>score</small></div><div><strong>{new Date(event.created_at).toLocaleDateString()}</strong><small>completed</small></div></div><div className="result-actions"><Button onClick={() => onNavigate("/scenarios")}>Choose another story <span>→</span></Button><button className="text-link" onClick={() => onNavigate("/progress")}>See my progress</button></div></section>;
}
