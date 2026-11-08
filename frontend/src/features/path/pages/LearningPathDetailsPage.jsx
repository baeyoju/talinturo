import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { m, useReducedMotion } from "framer-motion";
import { api } from "@/adapters/http/api";
import { DatabaseHelpNotice } from "@/components/feedback/DatabaseHelpNotice";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LessonMedia } from "../components/LessonMedia";

export function LearningPathDetailsPage({ onNavigate, reducedMotion }) {
  const { pathId } = useParams();
  const prefersReducedMotion = useReducedMotion() || reducedMotion;
  const [path, setPath] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setPath(null);
    setLessons([]);
    setLoadError("");
    setLoading(true);
    api(`/paths/${pathId}`)
      .then((result) => {
        if (!active) return;
        setPath(result.path);
        setLessons(result.lessons);
      })
      .catch((error) => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pathId]);
  if (loadError) return <><PageTitle eyebrow="LEARNING PATH" title="Path unavailable" /><DatabaseHelpNotice error={loadError} /><Button variant="outline" onClick={() => onNavigate("/paths")}>← All learning paths</Button></>;
  if (loading || !path) return <div className="empty-state">Loading learning path…</div>;
  const completedLessons = lessons.filter((lesson) => lesson.progress >= 100).length;
  const overallProgress = lessons.length ? Math.round(completedLessons * 100 / lessons.length) : 0;
  const currentLesson = lessons.find((lesson, index) =>
    lesson.progress < 100 && lessons.slice(0, index).every((previous) => previous.progress >= 100),
  );
  return <>
    <PageTitle eyebrow={path.level} title={path.title} description={path.description} action={<Button variant="outline" onClick={() => onNavigate("/paths")}>← All paths</Button>} />
    <section className="path-map-summary panel">
      <div className="path-map-summary-top"><span className="path-map-section">YOUR LEARNING JOURNEY</span><span className="path-map-level">{path.level || "FSL PATH"}</span></div>
      <div className="path-map-summary-main"><div><h2>{currentLesson ? "Keep your momentum!" : "Journey complete!"}</h2><p>{currentLesson ? `Next up: ${currentLesson.title}` : "You completed every lesson in this path."}</p></div><strong>{overallProgress}%</strong></div>
      <ProgressBar value={overallProgress} />
      <div className="path-map-summary-bottom"><span><Icon name="star" size={16} /> {completedLessons} of {lessons.length} lessons complete</span><span>{lessons.length} lesson{lessons.length === 1 ? "" : "s"}</span></div>
    </section>
    {lessons.length ? <m.div
      className="lesson-journey"
      aria-label="Lessons in this learning path"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 } } }}
    >
      {lessons.map((lesson, index) => {
        const sections = Array.isArray(lesson.content?.sections) ? lesson.content.sections : [];
        const hasSections = sections.length > 0;
        const hasMaterial = hasSections || Boolean(lesson.video_url);
        const completed = lesson.progress >= 100;
        const current = !completed && lessons.slice(0, index).every((previous) => previous.progress >= 100);
        const locked = !completed && !current;
        const status = completed ? "completed" : current ? "current" : "locked";
        const nodeAnimation = current
          ? {
            scale: [1, 1.08, 1],
            boxShadow: [
              "0 0 0 0 rgba(248, 201, 47, .28)",
              "0 0 0 12px rgba(248, 201, 47, 0)",
              "0 0 0 0 rgba(248, 201, 47, .28)",
            ],
          }
          : completed
            ? {
              boxShadow: [
                "0 0 16px rgba(248, 201, 47, .44)",
                "0 0 26px rgba(248, 201, 47, .78)",
                "0 0 16px rgba(248, 201, 47, .44)",
              ],
            }
            : undefined;
        return <m.article
          className={`lesson-stop lesson-stop-${index % 2 ? "right" : "left"} lesson-stop-${status}`}
          key={lesson.id}
          aria-label={`Lesson ${index + 1}: ${lesson.title}, ${status}`}
          variants={{
            hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 18 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.32, ease: "easeOut" }}
        >
          <div className="lesson-node-column">
            <m.div
              className="lesson-node"
              animate={prefersReducedMotion ? undefined : nodeAnimation}
              transition={{ duration: current ? 1.8 : 2.6, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            >
              <Icon name={completed ? "star" : locked ? "lock" : "bookOpen"} size={27} />
            </m.div>
            <span className="lesson-node-number">{String(index + 1).padStart(2, "0")}</span>
          </div>
          <div className="lesson-stop-card">
            <div className="lesson-stop-heading">
              <span className={`lesson-status-label lesson-status-${status}`}>
                {completed ? "Completed" : current ? "Current lesson" : "Locked"}
              </span>
              <span className="lesson-duration">{lesson.duration_minutes || "Lesson"}</span>
            </div>
            <h2>{lesson.title}</h2>
            {lesson.content?.description && <p>{lesson.content.description}</p>}
            <LessonMedia lesson={lesson} />
            <div className="path-card-progress"><ProgressBar value={lesson.progress} /><span>{lesson.progress}% complete</span></div>
            {locked && <p className="lesson-lock-note"><Icon name="lock" size={15} /> Complete the previous lesson to unlock this one.</p>}
            <Button
              variant={locked ? "outline" : "primary"}
              disabled={locked || !hasMaterial}
              onClick={() => onNavigate(`/paths/${pathId}/lessons/${lesson.id}`)}
            >
              {locked ? "Locked" : hasMaterial ? "Continue" : "Lesson content needed"}
            </Button>
          </div>
        </m.article>;
      })}
    </m.div> : <div className="empty-state"><Icon name="bookOpen" size={34} /><h2>No lessons in this path yet</h2><p>Add published lessons linked to this learning path in PostgreSQL <code>lessons</code>.</p></div>}
  </>;
}
