import { useEffect, useState } from "react";
import { api } from "@/adapters/http/api";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function LearnerClassroomsPage({ onToast }) {
  const [classrooms, setClassrooms] = useState([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api("/classrooms")
      .then((result) => setClassrooms(result.classrooms))
      .catch((error) => setLoadError(error.message));
  }, []);

  const joinClassroom = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api("/classrooms/join", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      setClassrooms((current) => [...current, result.classroom]);
      setCode("");
      onToast(`You joined ${result.classroom.name}!`);
    } catch (error) {
      onToast(`Couldn't join classroom: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return <>
    <PageTitle eyebrow="LEARNING IS BETTER TOGETHER" title="My classrooms" description="Join a learning community with a classroom code from your instructor." />
    {loadError && <p className="inline-error">Could not load classrooms: {loadError}</p>}
    <div className="students-layout">
      <form className="form-panel panel" onSubmit={joinClassroom}>
        <p className="eyebrow">JOIN YOUR COMMUNITY</p>
        <h2>Enter a classroom code</h2>
        <p className="form-description">Ask your instructor for their code, then join with your Talinturo account.</p>
        <label>Classroom code<input required maxLength={100} value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. SUNNY24" /></label>
        <div className="form-actions"><Button type="submit" disabled={loading}>{loading ? "Joining…" : "Join classroom"} <span>→</span></Button></div>
      </form>
      <section className="panel roster-panel">
        <div className="panel-heading"><div><p className="eyebrow">YOUR LEARNING CREW</p><h2>{classrooms.length} classroom{classrooms.length === 1 ? "" : "s"}</h2></div><span className="soft-tag">ACTIVE</span></div>
        {classrooms.length ? classrooms.map((classroom) => <article className="roster-row" key={classroom.id}>
          <span className="classroom-icon mint"><Icon name="school" size={22} /></span>
          <span><strong>{classroom.name}</strong><small>{classroom.description || "A place to learn together"}</small></span>
        </article>) : <div className="empty-state"><Icon name="sprout" size={34} /><h2>Find your learning crew</h2><p>When you join a classroom, it will show up here.</p></div>}
      </section>
    </div>
  </>;
}
