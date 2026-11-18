import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { Button } from "@/components/ui/Button";
import { AvatarMascot } from "@/features/profile/avatar/AvatarMascot";
import { buildPathNodes } from "../path-model";
import { PathLessonNode } from "../components/PathLessonNode";
import family from "@/assets/path/family.svg";
import xp from "@/assets/path/xp.svg";
import star from "@/assets/path/star.svg";
import trophy from "@/assets/path/trophy.svg";
import "../styles/path-map.css";

export function LearningPathsPage({ onNavigate }) {
  const { pathId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [avatar, setAvatar] = useState(null);
  const [progress, setProgress] = useState(null);
  const [openLesson, setOpenLesson] = useState(null);
  const scroller = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      setLoading(true); setError(""); setData(null); setAvatar(null); setProgress(null); setOpenLesson(null);
      const options = { signal: controller.signal };
      // Optional HUD/character failures never fabricate a balance or block lessons.
      api("/avatar", options).then(result => { if (!controller.signal.aborted) setAvatar(result.avatar); }).catch(() => {});
      api("/progress", options).then(result => { if (!controller.signal.aborted) setProgress(result); }).catch(() => {});
      try {
        let selected = pathId;
        if (!selected) {
          const result = await api("/paths", options);
          if (!Array.isArray(result.paths)) throw new Error("The lesson list could not be read. Please try again.");
          selected = result.paths[0]?.id;
        }
        const result = selected ? await api("/paths/" + selected, options) : { path: null, lessons: [] };
        if (!Array.isArray(result.lessons) || (selected && (!result.path || String(result.path.id) !== String(selected)))) throw new Error("The path response could not be read. Please try again.");
        if (!controller.signal.aborted) setData(result);
      } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
      finally { pending = false; if (!controller.signal.aborted) setLoading(false); }
    };
    load();
    const refresh = () => { if (document.visibilityState === "visible") load(); };
    // Keyboard/window focus is not a data-change event: refreshing on it can
    // remove the very node/card receiving the first keyboard interaction.
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); document.removeEventListener("visibilitychange", refresh); };
  }, [pathId, retry]);
  useEffect(() => { if (!loading) scroller.current?.closest('.path-content')?.scrollTo({ top: 0 }); }, [pathId, loading]);

  const nodes = buildPathNodes(data?.lessons);
  const weekly = Array.isArray(progress?.weekly_activity) ? progress.weekly_activity : [];
  const badges = Array.isArray(progress?.achievements) ? progress.achievements.filter(item => item.earned === true).length : null;
  return <div className="path-screen">
    <section ref={scroller} className="path-scroll" aria-label="Learning path" tabIndex="0"
      onClick={event => { if (!event.target.closest('.path-stop')) setOpenLesson(null); }}
      onKeyDown={event => { if (event.key === 'Escape') setOpenLesson(null); }}>
      <header className="path-scenario-header">
        <div><p>{data?.path?.level ? data.path.level + ":" : "LEVEL 1:"}</p>
          <h1>{data?.path?.title || "FAMILY & ME"}</h1>
          <p>{data?.path?.description || "Little signs. Everyday connections."}</p></div>
        <div className="path-family-icon"><img src={family} width="100" height="100" alt="" /></div>
      </header>
      {loading ? <p className="path-notice" role="status">Loading your learning path…</p> : error ? <div className="path-notice" role="alert"><p>{error}</p><Button onClick={() => setRetry(value => value + 1)}>TRY AGAIN</Button></div> : <>
        <div className="path-map">
          <ol aria-label="Five lessons">{nodes.map(node => <PathLessonNode key={node.id || "space-" + node.number} node={node} pathId={data?.path?.id} onNavigate={onNavigate} open={openLesson === node.number} setOpen={setOpenLesson} />)}</ol>
          <div className="path-companion"><AvatarMascot character={avatar?.character || "algwas"} equipped={avatar?.equipped || {}} /></div>
        </div>
      </>}
    </section>
    <aside className="path-hud" aria-label="Your saved learning activity">
      <div className="path-hud__stats">
        <span aria-label={"Available XP: " + (avatar?.balance ?? "unavailable")}><img src={xp} width="20.5" height="20.5" alt="" />{avatar?.balance ?? "—"}</span>
        <span aria-label="Star total not connected"><img src={star} width="24" height="24" alt="" />—</span>
        <span aria-label={"Earned achievements: " + (badges ?? "unavailable")}><img src={trophy} width="24" height="24" alt="" />{badges ?? "—"}</span>
      </div>
      <section className="path-hud__streak"><h2>STREAK</h2><div>
        <p>{progress ? progress.current_streak ? progress.current_streak + " day streak. Keep it going!" : "Start your daily streak!" : "Your saved activity is unavailable."}</p>
        {weekly.length > 0 && <ol aria-label="Saved practice activities in the last seven days" title="Practice activity history. The streak count also includes completed lessons, which this activity list does not contain.">{weekly.map(day => <li key={day.activity_date} data-active={Number(day.completed) > 0}>
          <span>{new Date(day.activity_date + "T00:00:00Z").toLocaleDateString("en", { weekday: "short", timeZone: "UTC" }).slice(0, 2)}</span>
          <span aria-label={day.activity_date + ": " + day.completed + " completed activities"}>{Number(day.completed) > 0 ? "✓" : ""}</span>
        </li>)}</ol>}
      </div></section>
    </aside>
  </div>;
}
