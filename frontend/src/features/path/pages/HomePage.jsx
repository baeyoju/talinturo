import { useContext, useEffect, useState } from "react";
import { m } from "framer-motion";
import { api } from "@/adapters/http/api";
import { PageMotionContext } from "@/components/layout/PageMotionContext";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import { introTextVariants } from "@/lib/motion";

// Learner dashboard ("Home").
export function HomePage({ user, onNavigate }) {
  const reduceMotion = useContext(PageMotionContext);
  const textVariants = introTextVariants(reduceMotion);
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api("/dashboard")
      .then(setSummary)
      .catch((error) => setLoadError(error.message));
  }, []);

  const firstName = user.name.split(" ")[0];

  return (
    <div className="learner-dashboard">
      <section className="learner-hero">
        <m.div
          className="learner-hero-copy"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.085, delayChildren: reduceMotion ? 0 : 0.04 } } }}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
        >
          <m.span className="dashboard-kicker" variants={textVariants}>YOUR LEARNING SPACE</m.span>
          <m.h1 variants={textVariants}>Hi, {firstName}!<br />Ready for a little progress?</m.h1>
          <m.p variants={textVariants}>Every sign is a new way to connect. Pick up where you left off, or explore something new.</m.p>
          <div className="learner-hero-actions">
            <Button className="dashboard-button-yellow" onClick={() => onNavigate(summary?.next_lesson ? `/paths/${summary.next_lesson.path_id}` : "/paths")}>Continue learning <span>→</span></Button>
            <button className="dashboard-text-button" onClick={() => onNavigate("/paths")}>Browse learning paths</button>
          </div>
        </m.div>
        <div className="learner-hero-art" aria-hidden="true">
          <div className="learner-art-orbit"><Icon name="hand" size={76} /></div>
          <span className="learner-art-spark learner-art-spark-one">✦</span>
          <span className="learner-art-spark learner-art-spark-two">✦</span>
          <span className="learner-art-caption">One sign at a time</span>
        </div>
      </section>

      {loadError && <p className="inline-error" role="alert">Could not load your learning summary: {loadError}</p>}

      <section className="dashboard-metrics" aria-label="Your learning at a glance">
        <StatCard icon="bookOpen" tone="blue" label="Lessons completed" value={summary ? summary.lessons_completed : "—"} change="Every step counts" />
        <StatCard icon="star" tone="yellow" label="Practice accuracy" value={summary?.average_score == null ? "—" : `${summary.average_score}%`} change="From completed activities" />
        <StatCard icon="flame" tone="coral" label="Learning streak" value={summary ? `${summary.learning_streak} days` : "—"} change="A little practice each day" />
      </section>

      <div className="learner-dashboard-grid">
        <section className="dashboard-card continue-card">
          <div className="dashboard-card-heading">
            <div><p className="dashboard-kicker">PICK UP WHERE YOU LEFT OFF</p><h2>Your next lesson</h2></div>
          </div>
          {summary?.next_lesson ? <>
            <div className="next-lesson">
              <div className="next-lesson-art"><Icon name="hand" size={39} /></div>
              <div className="next-lesson-copy">
                <span className="dashboard-kicker">{summary.next_lesson.path_title} · {summary.next_lesson.level}</span>
                <h3>{summary.next_lesson.title}</h3>
                <p>Continue building your skills, one lesson at a time.</p>
                <div className="next-lesson-progress"><ProgressBar value={summary.next_lesson.progress} color="blue" /><span>{summary.next_lesson.progress}%</span></div>
              </div>
            </div>
            <div className="next-lesson-footer"><span>{summary.next_lesson.duration_minutes ? `About ${summary.next_lesson.duration_minutes}` : "Continue at your own pace"}</span><Button onClick={() => onNavigate(`/paths/${summary.next_lesson.path_id}`)}>Continue <span>→</span></Button></div>
          </> : <div className="empty-state"><Icon name="bookOpen" size={30} /><h3>No lesson is ready yet</h3><p>Publish a lesson in the PostgreSQL <code>lessons</code> table and connect it to a published learning path.</p></div>}
        </section>

        <section className="dashboard-card quick-start-card">
          <div className="dashboard-card-heading"><div><p className="dashboard-kicker">MAKE A CONNECTION</p><h2>Quick ways to learn</h2></div><span className="quick-start-star">✦</span></div>
          <button className="quick-start-link" onClick={() => onNavigate("/vocabulary")}><span className="quick-start-icon quick-start-blue"><Icon name="book" size={21} /></span><span><strong>Explore vocabulary</strong><small>Learn useful everyday signs</small></span><b>→</b></button>
          <button className="quick-start-link" onClick={() => onNavigate("/scenarios")}><span className="quick-start-icon quick-start-coral"><Icon name="message" size={21} /></span><span><strong>Try a real-life story</strong><small>Practice in a friendly setting</small></span><b>→</b></button>
          <button className="quick-start-link" onClick={() => onNavigate("/challenge")}><span className="quick-start-icon quick-start-yellow"><Icon name="sparkles" size={21} /></span><span><strong>Take a level challenge</strong><small>See what you already know</small></span><b>→</b></button>
        </section>

        <section className="dashboard-card learner-path-card">
          <div className="dashboard-card-heading"><div><p className="dashboard-kicker">SMALL STEPS, BIG CONNECTIONS</p><h2>Your learning paths</h2></div><button className="dashboard-inline-link" onClick={() => onNavigate("/paths")}>See all <span>→</span></button></div>
          <div className="learner-paths">
            {summary?.featured_paths?.length ? summary.featured_paths.map((path, index) => (
              <button className={`learner-path-item ${index % 2 ? "path-item-coral" : "path-item-yellow"}`} key={path.id} onClick={() => onNavigate(`/paths/${path.id}`)}><span className="path-item-icon"><Icon name={index % 2 ? "home" : "hand"} size={24} /></span><span><strong>{path.title}</strong><small>{path.description || path.level}</small></span><Icon name="compass" size={19} /></button>
            )) : <div className="empty-state"><Icon name="bookOpen" size={30} /><h3>No learning paths yet</h3><p>Add a published path to PostgreSQL <code>learning_paths</code> to show it here.</p></div>}
          </div>
        </section>
      </div>
      <section className="learner-encouragement"><Icon name="heart" size={22} /><p><strong>Learning looks different for everyone.</strong> Go at your own pace. There's no wrong way to make progress.</p><button onClick={() => onNavigate("/progress")}>View my progress <span>→</span></button></section>
    </div>
  );
}
