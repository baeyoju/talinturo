import { useEffect, useState } from "react";
import { api } from "@/adapters/http/api";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatCard } from "@/components/ui/StatCard";
import { LearnerTable } from "../components/LearnerTable";

export function InstructorHomePage({ user, onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [roster, setRoster] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [rosterLoaded, setRosterLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api("/dashboard"),
      api("/instructor/learners"),
      api("/instructor/classrooms"),
    ])
      .then(([dashboardData, learnersData, classroomsData]) => {
        setSummary(dashboardData);
        setRoster(learnersData.learners.map((learner, index) => ({
          ...learner,
          initials: learner.name.split(" ").map((part) => part[0]).slice(0, 2).join(""),
          color: ["coral", "blue", "purple", "gold"][index % 4],
        })));
        setClassrooms(classroomsData.classrooms);
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setRosterLoaded(true));
  }, []);

  const firstName = user.name.split(" ")[0];

  return <>
    <div className="instructor-dashboard">
      <section className="instructor-hero">
        <div><span className="dashboard-kicker">YOUR CLASSROOM, AT A GLANCE</span><h1>Welcome back, {firstName}.</h1><p>Small moments of encouragement can make a big difference. Here's what's happening in your learning community.</p></div>
        <Button className="dashboard-button-yellow" onClick={() => onNavigate("/classrooms/create")}>＋ Create a classroom</Button>
      </section>
      {loadError && <p className="inline-error" role="alert">Could not load your classroom overview: {loadError}</p>}
      <div className="dashboard-metrics instructor-metrics">
        <StatCard icon="users" tone="blue" label="Learners" value={summary ? roster.length : "—"} change="In your learning community" />
        <StatCard icon="school" tone="yellow" label="Classrooms" value={summary ? summary.classrooms : "—"} change="Spaces to learn together" />
        <StatCard icon="bookOpen" tone="coral" label="Lessons completed" value={summary ? summary.lessons_completed : "—"} change="Across your account" />
        <StatCard icon="heart" tone="mint" label="Learners to encourage" value={summary ? roster.filter((learner) => learner.accuracy < 85).length : "—"} change="A kind check-in can help" />
      </div>
      <div className="instructor-dashboard-grid">
        <section className="dashboard-card instructor-roster-card">
          <div className="dashboard-card-heading"><div><p className="dashboard-kicker">YOUR PEOPLE</p><h2>Learner snapshots</h2></div><button className="dashboard-inline-link" onClick={() => onNavigate("/learners")}>All learners <span>→</span></button></div>
          {roster.length > 0
            ? <LearnerTable rows={roster.slice(0, 4)} onNavigate={onNavigate} />
            : !rosterLoaded && !loadError ? <p className="dashboard-loading">Loading your learner roster…</p> : !loadError && <p className="empty-table">No active learners are connected to your classrooms yet.</p>}
        </section>
        <section className="dashboard-card instructor-classrooms-card">
          <div className="dashboard-card-heading"><div><p className="dashboard-kicker">LEARN TOGETHER</p><h2>Your classrooms</h2></div><span className="classroom-card-mark"><Icon name="school" size={22} /></span></div>
          {classrooms.length ? classrooms.slice(0, 3).map((classroom) => (
            <div className="dashboard-classroom" key={classroom.id}><span className="classroom-mark"><Icon name="home" size={19} /></span><span><strong>{classroom.name}</strong><small>{classroom.student_count} learners · {classroom.code}</small></span><Icon name="compass" size={18} /></div>
          )) : !loadError && <p className="dashboard-loading">Loading your classrooms…</p>}
          {classrooms.length === 0 && !loadError && summary?.classrooms === 0 && <p className="classroom-empty">Your first classroom is just a little step away.</p>}
          <Button variant="outline" className="full-button" onClick={() => onNavigate("/classrooms")}>Manage classrooms <span>→</span></Button>
        </section>
        <section className="dashboard-card instructor-next-step">
          <span className="instructor-next-icon"><Icon name="lightbulb" size={26} /></span>
          <p className="dashboard-kicker">A GENTLE REMINDER</p>
          <h2>Celebrate the effort, not just the answer.</h2>
          <p>Every attempt is a brave step toward better communication. Your encouragement matters.</p>
          <button className="dashboard-inline-link" onClick={() => onNavigate("/help")}>More teaching tips <span>→</span></button>
        </section>
      </div>
    </div>
  </>;
}
