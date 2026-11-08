import { useEffect, useState } from "react";
import { api } from "@/adapters/http/api";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function ScenariosPage({ onNavigate }) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    api("/scenarios")
      .then((result) => setScenarios(result.scenarios))
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);
  return <>
    <PageTitle eyebrow="LEARN BY LIVING IT" title="Choose a scenario" description="Practice useful signs in everyday moments. Pick a story and see where the conversation takes you." />
    {loadError && <p className="inline-error">Could not load scenarios: {loadError}</p>}
    <div className="scenario-banner"><Icon name="message" size={25} /><div><strong>Real moments, real connection</strong><p>Each scenario is a safe space to try, make mistakes, and grow your confidence.</p></div><span className="scenario-count">{scenarios.length} stories <b>·</b> 5–10 min each</span></div>
    {loading ? <div className="empty-state">Loading scenarios…</div> : scenarios.length ? <div className="scenario-grid">{scenarios.map((scenario, index) => {
      const colors = ["peach", "lavender", "mint"];
      const tag = scenario.category || "Scenario";
      return <article className="scenario-card" key={scenario.id}><div className={`scenario-art ${scenario.color || colors[index % colors.length]}`}><span>{scenario.emoji || <Icon name="message" size={38} />}</span><small>{tag}</small></div><div className="scenario-content"><span className="eyebrow">{tag.toUpperCase()} SCENARIO</span><h2>{scenario.title}</h2><p>{scenario.description}</p><div className="scenario-bottom"><span>{scenario.duration_minutes ? `⏱ ${scenario.duration_minutes} min` : tag}</span><Button variant="outline" onClick={() => onNavigate(`/activity/${scenario.id}`)}>Start story <span>→</span></Button></div></div></article>;
    })}</div> : <div className="empty-state"><Icon name="message" size={34} /><h2>No scenarios available yet</h2><p>Add a published scenario activity to PostgreSQL <code>activities</code>, with prompts and choices in its JSONB <code>content</code>.</p></div>}
    <div className="gentle-note"><Icon name="sprout" size={23} /><span>There's no pressure to get it perfect. This is your space to explore.</span></div>
  </>;
}
