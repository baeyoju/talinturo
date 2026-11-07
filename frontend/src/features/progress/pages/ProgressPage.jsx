import { useEffect, useState } from "react";
import { api } from "@/adapters/http/api";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatCard } from "@/components/ui/StatCard";

export function ProgressPage() {
  const [dashboard, setDashboard] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    Promise.all([api("/dashboard"), api("/progress")])
      .then(([dashboardData, progressData]) => { setDashboard(dashboardData); setProgress(progressData); })
      .catch((error) => setLoadError(error.message));
  }, []);
  const weeklyActivity = progress?.weekly_activity || [];
  const maxDailyActivity = Math.max(1, ...weeklyActivity.map((day) => day.completed));
  const earnedAchievements = (progress?.achievements || []).filter((achievement) => achievement.earned).length;
  return <>
    <PageTitle eyebrow="LOOK HOW FAR YOU'VE COME" title="My progress" description="Every practice session counts. Here's a little snapshot of your learning journey." action={<Button variant="outline" onClick={() => window.print()}>↓ Save my progress</Button>} />
    {loadError && <p className="inline-error">Could not refresh your progress: {loadError}</p>}
    <div className="progress-overview">
      <StatCard icon="bookOpen" tone="lavender" label="Lessons done" value={dashboard ? dashboard.lessons_completed : "—"} change="Completed activities of type lesson" />
      <StatCard icon="flame" tone="yellow" label="Current streak" value={progress ? `${progress.current_streak} days` : "—"} change="Consecutive days with a completed activity" />
      <StatCard icon="star" tone="peach" label="Completed activities" value={progress ? progress.activity_count : "—"} change="Saved to your profile" />
      <StatCard icon="heart" tone="mint" label="Badges earned" value={progress ? earnedAchievements : "—"} change="From published achievements" />
    </div>
    <div className="progress-content-grid">
      <section className="panel progress-chart-panel">
        <div className="panel-heading"><div><p className="eyebrow">SHOWING UP IS EVERYTHING</p><h2>Your learning rhythm</h2></div><span className="soft-tag">Last 7 days</span></div>
        {weeklyActivity.length ? <div className="large-chart">{weeklyActivity.map((day) => <div key={day.activity_date}><span className="large-chart-bar" style={{ height: `${Math.max(3, (day.completed / maxDailyActivity) * 100)}%` }} /><small>{new Date(`${day.activity_date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</small></div>)}</div> : <div className="empty-state"><p>Completed activity will appear here once progress has been saved.</p></div>}
        <p className="chart-caption">Daily totals are calculated from your completed PostgreSQL activity records.</p>
      </section>
      <section className="panel level-panel"><p className="eyebrow">RECENT ACTIVITY</p><h2>Your completed work</h2>{progress?.events?.length ? <div className="timeline">{progress.events.slice(0, 6).map((event, index) => <div key={`${event.activity}-${event.created_at}-${index}`}><i className={`timeline-dot ${["mint", "peach", "lavender"][index % 3]}`} /><span><strong>{event.activity} · {event.score}%</strong><small>{new Date(event.created_at).toLocaleString()}</small></span></div>)}</div> : <p>No completed activities yet. Publish and complete a practice or scenario activity to begin tracking progress.</p>}</section>
    </div>
    <section className="panel achievement-list">
      <div className="panel-heading"><div><p className="eyebrow">MILESTONES TO CELEBRATE</p><h2>Your badges</h2></div><span className="soft-tag">{earnedAchievements} earned</span></div>
      {progress?.achievements?.length ? <div className="badge-list">{progress.achievements.map((achievement) => <div className={achievement.earned ? "" : "badge-locked"} key={achievement.id}><Icon name={achievement.earned ? "star" : "lock"} size={22} /><strong>{achievement.name}</strong><small>{achievement.description}</small></div>)}</div> : <div className="empty-state"><p>No published achievements yet. Add definitions to the PostgreSQL <code>achievements</code> table.</p></div>}
    </section>
  </>;
}
