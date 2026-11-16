import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { DatabaseHelpNotice } from "@/components/feedback/DatabaseHelpNotice";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LandmarkCamera } from "@/features/lesson/components/LandmarkCamera";

let youtubeApiPromise;
let vimeoApiPromise;

function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        resolve(window.YT);
      };
      let script = document.querySelector("script[data-youtube-iframe-api]");
      if (!script) {
        script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.dataset.youtubeIframeApi = "true";
        document.head.appendChild(script);
      }
      script.addEventListener("error", () => {
        youtubeApiPromise = null;
        reject(new Error("The YouTube player API could not be loaded."));
      }, { once: true });
    });
  }
  return youtubeApiPromise;
}

function loadVimeoApi() {
  if (window.Vimeo?.Player) return Promise.resolve(window.Vimeo);
  if (!vimeoApiPromise) {
    vimeoApiPromise = new Promise((resolve, reject) => {
      let script = document.querySelector("script[data-vimeo-player-api]");
      const loaded = () => {
        if (window.Vimeo?.Player) resolve(window.Vimeo);
        else reject(new Error("The Vimeo player API could not be loaded."));
      };
      if (!script) {
        script = document.createElement("script");
        script.src = "https://player.vimeo.com/api/player.js";
        script.async = true;
        script.dataset.vimeoPlayerApi = "true";
      }
      script.addEventListener("load", loaded, { once: true });
      script.addEventListener("error", () => {
        vimeoApiPromise = null;
        reject(new Error("The Vimeo player API could not be loaded."));
      }, { once: true });
      if (window.Vimeo?.Player) loaded();
      else if (!script.isConnected) document.head.appendChild(script);
    });
  }
  return vimeoApiPromise;
}

function getVideoSource(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let youtubeId = "";
    if (host === "youtu.be") youtubeId = url.pathname.split("/").filter(Boolean)[0] || "";
    else if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
      youtubeId = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] || "";
    }
    if (/^[\w-]{11}$/.test(youtubeId)) {
      const embed = new URL(`https://www.youtube-nocookie.com/embed/${youtubeId}`);
      embed.searchParams.set("playsinline", "1");
      embed.searchParams.set("enablejsapi", "1");
      embed.searchParams.set("origin", window.location.origin);
      return { kind: "youtube", id: youtubeId, url: embed.toString() };
    }
    const vimeoId = host === "vimeo.com" || host === "player.vimeo.com"
      ? url.pathname.match(/(?:\/video)?\/(\d+)/)?.[1]
      : null;
    if (vimeoId) {
      const embed = new URL(`https://player.vimeo.com/video/${vimeoId}`);
      embed.searchParams.set("title", "0");
      embed.searchParams.set("byline", "0");
      embed.searchParams.set("portrait", "0");
      if (url.searchParams.has("h")) embed.searchParams.set("h", url.searchParams.get("h"));
      return { kind: "vimeo", id: vimeoId, url: embed.toString() };
    }
    return { kind: "file", url: value };
  } catch {
    return { kind: "file", url: value };
  }
}

export function LessonViewerPage({ onNavigate }) {
  const { pathId, lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [videoError, setVideoError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [practiceAnswers, setPracticeAnswers] = useState([]);
  const [practiceConfirmed, setPracticeConfirmed] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceFeedback, setPracticeFeedback] = useState("");
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const embedRef = useRef(null);
  const completeLessonRef = useRef(null);
  const completionPendingRef = useRef(false);
  const completedLessonRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLesson(null);
    setError("");
    api(`/lessons/${lessonId}/start`, { method: "POST" })
      .then(() => api(`/lessons/${lessonId}`))
      .then(({ lesson: result }) => { if (active) setLesson(result); })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [lessonId]);

  const sections = Array.isArray(lesson?.content?.sections) ? lesson.content.sections : [];
  const captionsUrl = lesson?.content?.captions_url;
  const transcript = lesson?.content?.transcript;
  const hasTranscript = Boolean(transcript || sections.length);
  const videoSource = lesson?.video_url ? getVideoSource(lesson.video_url) : null;
  const practiceQuestions = Array.isArray(lesson?.content?.practice?.questions) ? lesson.content.practice.questions : [];
  const inPractice = practiceOpen;

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  const completeLesson = useCallback(async () => {
    if (lesson?.progress >= 50 || completionPendingRef.current) return;
    completionPendingRef.current = true;
    setSaving(true);
    setNotice("");
    try {
      await api(`/lessons/${lessonId}/complete`, { method: "POST" });
      setLesson((current) => ({ ...current, progress: Math.max(50, current.progress || 0) }));
      setNotice("Video complete. Your lesson is 50% done. Continue to the practice.");
    } catch (saveError) {
      setNotice(saveError.message);
    } finally {
      completionPendingRef.current = false;
      setSaving(false);
    }
  }, [lesson?.progress, lessonId]);
  completeLessonRef.current = completeLesson;

  useEffect(() => {
    if (!videoSource || videoSource.kind === "file" || !embedRef.current) return undefined;
    let cancelled = false;
    let player;
    const onEnded = () => completeLessonRef.current?.();
    const onApiError = (apiError) => {
      if (!cancelled) setVideoError(apiError.message || "Could not connect to the video player.");
    };

    if (videoSource.kind === "youtube") {
      loadYoutubeApi()
        .then((youtube) => {
          if (cancelled || !embedRef.current) return;
          player = new youtube.Player(embedRef.current, {
            events: {
              onStateChange: (event) => {
                if (event.data === youtube.PlayerState.ENDED) onEnded();
              },
              onError: () => setVideoError("YouTube could not play this video. Check that it is public and embedding is allowed."),
            },
          });
        })
        .catch(onApiError);
    } else {
      loadVimeoApi()
        .then((vimeo) => {
          if (cancelled || !embedRef.current) return;
          player = new vimeo.Player(embedRef.current);
          player.on("ended", onEnded);
          player.on("error", onApiError);
        })
        .catch(onApiError);
    }

    return () => {
      cancelled = true;
      if (player?.destroy) player.destroy();
    };
  }, [videoSource?.id, videoSource?.kind]);

  const submitPractice = async () => {
    setSaving(true);
    setPracticeFeedback("");
    try {
      const result = await api(`/lessons/${lessonId}/practice/complete`, { method: "POST", body: JSON.stringify({ answers: practiceAnswers, practice_confirmed: practiceConfirmed }) });
      if (result.completed) { setLesson((current) => ({ ...current, progress: 100 })); setPracticeFeedback("Practice complete. Lesson progress saved at 100%."); }
      else setPracticeFeedback(`${result.message} Score: ${result.score}%.`);
    } catch (saveError) { setPracticeFeedback(saveError.message); }
    finally { setSaving(false); }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await playerRef.current?.requestFullscreen();
    } catch {
      setNotice("Fullscreen is unavailable in this browser.");
    }
  };

  if (error) return <><PageTitle eyebrow="LESSON" title="Lesson unavailable" /><DatabaseHelpNotice error={error} /><Button variant="outline" onClick={() => onNavigate(`/paths/${pathId}`)}>Back to learning path</Button></>;
  if (!lesson) return <div className="empty-state">Loading lesson...</div>;

  return <>
    <PageTitle eyebrow={lesson.path_title || "LEARNING PATH"} title={lesson.title} description={lesson.description || lesson.content?.description} action={<Button variant="outline" onClick={() => onNavigate(`/paths/${pathId}`)}>Back to path</Button>} />
    {inPractice ? <section className="lesson-practice panel"><p className="eyebrow">PRACTICE - 50% COMPLETE</p><h2>Practice what you learned</h2><div className="lesson-practice-grid"><div className="lesson-quiz">{practiceQuestions.map((question, questionIndex) => <div className="activity-question" key={question.id || questionIndex}><h3>{question.prompt}</h3><div className="choice-grid">{(question.choices || []).map((choice, choiceIndex) => { const choiceId = choice.id ?? choice.label; return <button type="button" className={`choice-card ${practiceAnswers[questionIndex] === choiceId ? "choice-selected" : ""}`} key={choiceId ?? choiceIndex} onClick={() => { setPracticeAnswers((answers) => { const next = [...answers]; next[questionIndex] = choiceId; return next; }); setPracticeFeedback(""); }}><strong>{choice.label}</strong><span aria-hidden="true">{practiceAnswers[questionIndex] === choiceId ? "Selected" : ""}</span></button>; })}</div></div>)}<label className="practice-confirm"><input type="checkbox" checked={practiceConfirmed} onChange={(event) => setPracticeConfirmed(event.target.checked)} /> I practiced the sign using the guide.</label>{practiceFeedback && <p role="status">{practiceFeedback}</p>}{lesson.progress < 100 && <Button disabled={saving || practiceAnswers.length < practiceQuestions.length || practiceAnswers.some((answer) => answer === undefined) || !practiceConfirmed} onClick={submitPractice}>{saving ? "Checking..." : "Submit practice"}</Button>}</div><LandmarkCamera /></div></section> : lesson.video_url ? <div className={`lesson-viewer-layout ${transcriptOpen && hasTranscript ? "transcript-open" : "transcript-closed"}`}>
      <section className="lesson-player-card" ref={playerRef} aria-label="Lesson video player">
        <div className="lesson-player-frame">
          {videoSource.kind === "file" ? <video
            ref={videoRef}
            className="lesson-player"
            controls
            playsInline
            preload="metadata"
            poster={lesson.image_url || undefined}
            onEnded={completeLesson}
            onError={() => setVideoError("This video could not be played. Use a direct MP4, WebM, or Ogg media URL, or provide a YouTube or Vimeo link.")}
            onLoadedData={() => setVideoError("")}
          >
            <source src={videoSource.url} />
            {captionsUrl && <track kind="captions" src={captionsUrl} srcLang="en" label="English captions" />}
            Your browser does not support HTML video.
          </video> : <iframe
            className="lesson-player lesson-player-embed"
            ref={embedRef}
            src={videoSource.url}
            title={`${lesson.title} video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => setVideoError("")}
          />}
        </div>
        {videoError && <p className="lesson-video-error" role="alert">{videoError}</p>}
        <div className="lesson-player-toolbar">
          <span className="lesson-player-tools-label"><Icon name="play" size={17} /> Lesson video</span>
          <div className="lesson-player-tools">
            <button type="button" className="lesson-tool-button" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              <Icon name={fullscreen ? "minimize" : "maximize"} size={17} />{fullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
            {hasTranscript && <button type="button" className="lesson-tool-button lesson-transcript-toggle" onClick={() => setTranscriptOpen((open) => !open)} aria-expanded={transcriptOpen}>
              <Icon name="bookOpen" size={17} />{transcriptOpen ? "Hide transcript" : "Show transcript"}
            </button>}
          </div>
        </div>
      </section>
      {transcriptOpen && hasTranscript && <aside className="lesson-transcript panel" aria-label="Lesson transcript">
        <div className="lesson-transcript-heading"><p className="eyebrow">FOLLOW ALONG</p><h2>Transcript</h2></div>
        {transcript && <p className="lesson-transcript-copy">{transcript}</p>}
        {sections.map((section, index) => <section className="lesson-transcript-section" key={`${section.title || "section"}-${index}`}><h3>{section.title || `Section ${index + 1}`}</h3><p>{section.body}</p></section>)}
      </aside>}
    </div> : sections.length > 0 ? <div className="lesson-viewer-content">{sections.map((section, index) => <section className="panel" key={`${section.title || "section"}-${index}`}><h2>{section.title || `Section ${index + 1}`}</h2><p>{section.body}</p></section>)}</div> : <div className="empty-state"><Icon name="bookOpen" size={32} /><p>Lesson material is not available yet.</p></div>}
    {!inPractice && <div className="lesson-viewer-actions">{notice && <p role="status">{notice}</p>}<Button onClick={() => lesson.progress >= 50 ? setPracticeOpen(true) : completeLesson()} disabled={saving || (Boolean(lesson.video_url) && lesson.progress < 50)}>{saving ? "Saving..." : "Proceed to practice"}</Button></div>}
  </>;
}

