import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { DatabaseHelpNotice } from "@/components/feedback/DatabaseHelpNotice";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

function lessonContent(content) {
  if (content && typeof content === "object") return content;
  if (typeof content !== "string") return {};
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function lessonSections(content) {
  const sections = lessonContent(content).sections;
  return Array.isArray(sections) ? sections : [];
}

export function LessonViewerPage({ onNavigate }) {
  const { pathId, lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [completionError, setCompletionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [mediaError, setMediaError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setCompletionError("");
    setMediaError("");
    setCompleted(false);
    api(`/lessons/${lessonId}`)
      .then(({ lesson: result }) => {
        if (!active) return;
        setLesson(result);
        setCompleted(result.progress >= 100);
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lessonId]);

  const sections = useMemo(() => lessonSections(lesson?.content), [lesson]);

  const completeLesson = async () => {
    setCompleting(true);
    setCompletionError("");
    try {
      await api(`/lessons/${lessonId}/complete`, { method: "POST" });
      setCompleted(true);
      setLesson((current) => current ? { ...current, progress: 100 } : current);
    } catch (error) {
      setCompletionError(error.message);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <div className="empty-state">Loading lesson…</div>;
  if (loadError) {
    return <>
      <PageTitle eyebrow="LESSON" title="Lesson unavailable" />
      <DatabaseHelpNotice error={loadError} />
      <Button variant="outline" onClick={() => onNavigate(`/paths/${pathId}`)}>← Back to learning path</Button>
    </>;
  }
  if (!lesson) return null;

  return (
    <div className="lesson-viewer">
      <PageTitle
        eyebrow={lesson.path_title || "LESSON"}
        title={lesson.title}
        description={lesson.description}
        action={<Button variant="outline" onClick={() => onNavigate(`/paths/${pathId}`)}>← Back to path</Button>}
      />
      <section className="lesson-player-card">
        {lesson.video_url
          ? <video
            className="lesson-player"
            controls
            preload="metadata"
            src={lesson.video_url}
            onError={() => setMediaError("This lesson video could not be loaded. You can still review the notes below.")}
          >
            {lesson.captions_url && <track kind="captions" src={lesson.captions_url} srcLang="en" label="Captions" />}
            Your browser does not support lesson video playback.
          </video>
          : <div className="lesson-player-empty"><Icon name="bookOpen" size={34} /><span>This lesson is text-based.</span></div>}
        <div className="lesson-player-controls">
          <span><Icon name={completed ? "star" : "bookOpen"} size={18} /> {completed ? "Lesson completed" : `${lesson.progress || 0}% complete`}</span>
          {!completed && <Button onClick={completeLesson} disabled={completing}>{completing ? "Saving…" : "Mark lesson complete"}</Button>}
        </div>
        {mediaError && <p className="lesson-caption-note" role="alert">{mediaError}</p>}
        {completionError && <p className="lesson-caption-note" role="alert">{completionError}</p>}
      </section>
      <section className="lesson-transcript">
        <div className="lesson-transcript-heading">
          <p className="eyebrow">LEARN AT YOUR OWN PACE</p>
          <h2>Lesson notes</h2>
        </div>
        {sections.length
          ? sections.map((section, index) => (
            <article className="lesson-transcript-section" key={`${section.title || "section"}-${index}`}>
              <h3>{section.title || `Section ${index + 1}`}</h3>
              <p>{typeof section === "string" ? section : section.body || section.text || ""}</p>
            </article>
          ))
          : <p className="lesson-transcript-copy">Review the video above and practise the signs at your own pace.</p>}
      </section>
      <div className="lesson-viewer-actions">
        <Button variant="outline" onClick={() => onNavigate(`/paths/${pathId}`)}>Return to learning path</Button>
      </div>
    </div>
  );
}
