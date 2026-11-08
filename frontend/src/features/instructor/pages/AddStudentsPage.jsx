import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function AddStudentsPage({ onNavigate, onToast, demoMode }) {
  const { id } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    api(`/instructor/classrooms/${id}/students`).then((result) => {
      setClassroom(result.classroom);
      setStudents(result.students);
    }).catch((error) => setLoadError(error.message));
  }, [id]);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api(`/instructor/classrooms/${id}/students`, { method: "POST", body: JSON.stringify({ name, email }) });
      setStudents((current) => [...current, result.student]);
      setName("");
      setEmail("");
      onToast("Learner added to your classroom.");
    } catch (error) {
      onToast(`Couldn't add learner: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  return <><PageTitle eyebrow="GROW YOUR LEARNING COMMUNITY" title="Add students" description={demoMode ? "Add a learner to this local demo classroom." : "Add a learner who already has a Talinturo account using their registered email."} action={<Button variant="outline" onClick={() => onNavigate("/classrooms")}>← Classrooms</Button>} /><section className="classroom-detail-banner panel"><Icon name="home" size={27} /><div><small>CLASSROOM</small><h2>{classroom?.name || "Your classroom"}</h2><p>Class code <strong>{classroom?.code || "…"}</strong></p></div></section><div className="students-layout"><form className="form-panel panel" onSubmit={submit}><p className="eyebrow">{demoMode ? "LOCAL DEMO ROSTER" : "REGISTERED LEARNER"}</p><h2>Add a learner</h2><p className="form-description">{demoMode ? "Add a name and email address to this local demo roster." : "Enter the email address on their Talinturo account. Or share the classroom code so they can join themselves."}</p>{demoMode && <label>Learner name<input required maxLength={70} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sam Rivera" /></label>}<label>{demoMode ? "Family or learner email" : "Learner email"}<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><div className="form-actions"><Button type="submit" disabled={loading}>{loading ? "Adding…" : "Add to classroom"} <span>→</span></Button></div></form><section className="panel roster-panel"><div className="panel-heading"><div><p className="eyebrow">LEARNING TOGETHER</p><h2>{students.length} learner{students.length === 1 ? "" : "s"}</h2></div><span className="soft-tag">PRIVATE ROSTER</span></div>{loadError && <p className="inline-error">Could not load roster: {loadError}</p>}{students.length ? students.map((student) => <div className="roster-row" key={student.id}><span className="avatar avatar-mint">{student.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{student.name}</strong><small>{student.email}</small></span><span className="room-status">ACTIVE</span></div>) : <div className="empty-state"><Icon name="sprout" size={34} /><h2>A new beginning</h2><p>Your learners will appear here once added.</p></div>}</section></div></>;
}
