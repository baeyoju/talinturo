import { useEffect, useState } from "react";
import { api } from "@/adapters/http/api";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function InstructorClassroomsPage({ onNavigate }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    api("/instructor/classrooms").then((result) => setClassrooms(result.classrooms)).catch((error) => setLoadError(error.message));
  }, []);
  return <>
    <PageTitle eyebrow="LEARNING IS BETTER TOGETHER" title="Virtual classrooms" description="Create a welcoming place where learners can practice, grow, and cheer one another on." action={<Button onClick={() => onNavigate("/classrooms/create")}>＋ Create classroom</Button>} />
    {loadError && <p className="inline-error">Could not load classrooms: {loadError}</p>}
    <div className="classroom-list">
      {classrooms.map((classroom, index) => (
        <article className="classroom-card panel" key={classroom.code}>
          <div className={`classroom-icon ${index % 2 === 0 ? "mint" : "lavender"}`}><Icon name={index % 2 === 0 ? "home" : "school"} size={27} /></div>
          <div className="classroom-details">
            <span className="room-status">ACTIVE CLASSROOM</span>
            <h2>{classroom.name}</h2>
            <p>{classroom.student_count} learner{classroom.student_count === 1 ? "" : "s"} <i>·</i> {classroom.created_at ? `Created ${new Date(`${classroom.created_at.replace(" ", "T")}Z`).toLocaleDateString()}` : "Just created"}</p>
            <div className="class-code">CLASS CODE <strong>{classroom.code}</strong><button onClick={async () => { try { await navigator.clipboard.writeText(classroom.code); } catch { setLoadError("Clipboard access is unavailable in this browser."); } }}>Copy code</button></div>
          </div>
          <div className="classroom-actions">
            <Button variant="outline" onClick={() => onNavigate(`/classrooms/${classroom.id}/students`)}>Add students</Button>
            <Button variant="outline" onClick={() => onNavigate("/learners")}>View learners</Button>
          </div>
        </article>
      ))}
    </div>
    {classrooms.length === 0 && !loadError && <div className="empty-state"><Icon name="home" size={34} /><h2>No classrooms yet</h2><p>Create a classroom to invite learners into your space.</p></div>}
    <section className="invite-panel"><div><Icon name="mail" size={24} /><h2>Invite learners into your classroom</h2><p>Share your classroom code with learners who already have a Talinturo account so they can join.</p></div><Button variant="outline" onClick={() => onNavigate("/classrooms/create")}>Create a classroom</Button></section>
  </>;
}
