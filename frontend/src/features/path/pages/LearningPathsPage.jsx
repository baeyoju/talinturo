import { useEffect, useState } from "react";
import { api } from "@/adapters/http/api";
import { DatabaseHelpNotice } from "@/components/feedback/DatabaseHelpNotice";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function LearningPathsPage({ onNavigate }) {
  const [filter, setFilter] = useState("All paths");
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    api("/paths")
      .then((result) => setPaths(result.paths))
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);
  const visiblePaths = paths.filter((path) =>
    filter === "All paths"
    || (filter === "In progress" && path.progress > 0 && path.progress < 100)
    || (filter === "Not started" && path.progress === 0)
    || (filter === "Completed" && path.progress === 100),
  );
  return <>
    <PageTitle eyebrow="LEARN AT YOUR OWN PACE" title="Learning paths" description="A little practice each day goes a long way. Find the path that feels right for you." action={<Button onClick={() => onNavigate("/practice")}><Icon name="hand" size={17} /> Quick practice</Button>} />
    <div className="filter-row">{["All paths", "In progress", "Not started", "Completed"].map((item) => <button key={item} className={`filter-chip ${filter === item ? "filter-active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}</div>
    {loadError && <DatabaseHelpNotice error={loadError} />}
    {loading ? <div className="empty-state">Loading your learning paths…</div> : visiblePaths.length ? <div className="learning-path-grid">{visiblePaths.map((path, index) => {
      const color = ["peach", "lavender", "yellow"][index % 3];
      return <article className="path-card" key={path.id}><div className={`path-card-art ${color}`}><span className="path-emoji"><Icon name="bookOpen" size={42} /></span><span className="path-level">{path.level}</span><span className="path-sparkle">✦</span></div><div className="path-card-content"><span className="eyebrow">LEARNING PATH</span><h2>{path.title}</h2>{path.description && <p>{path.description}</p>}<div className="path-card-meta"><span>▤ {path.lessons} bite-sized lessons</span></div><div className="path-card-progress"><ProgressBar value={path.progress} /><span>{path.progress}% complete</span></div><Button variant={path.progress ? "primary" : "outline"} onClick={() => onNavigate(`/paths/${path.id}`)}>View lessons <span>→</span></Button></div></article>;
    })}</div> : <div className="empty-state"><Icon name="sprout" size={34} /><h2>{paths.length ? "No paths in this group yet" : "No published learning paths yet"}</h2><p>{paths.length ? "Choose another filter to see your paths." : <>Add a published record to PostgreSQL <code>learning_paths</code> and link published lessons to it.</>}</p></div>}
    <section className="encouragement-strip"><Icon name="sparkles" size={26} /><div><strong>Learning looks different for everyone.</strong><p>Go at your own pace. There's no wrong way to make progress.</p></div><button className="text-link" onClick={() => onNavigate("/help")}>Our approach →</button></section>
  </>;
}
