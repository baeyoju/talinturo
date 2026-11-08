import { useState } from "react";
import { api } from "@/adapters/http/api";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function CreateClassroomPage({ onNavigate, onToast }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return onToast("Give your classroom a name before creating it.");
    setSubmitting(true);
    try {
      await api("/instructor/classrooms", { method: "POST", body: JSON.stringify({ name: name.trim(), description: description.trim() }) });
      onToast("Your new classroom is ready!");
      onNavigate("/classrooms");
    } catch (error) {
      onToast(`Couldn't create classroom: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  return <><PageTitle eyebrow="A SPACE TO LEARN TOGETHER" title="Create a classroom" description="Start a welcoming space where your learners can practice and grow together." /><form className="form-panel panel" onSubmit={submit}><div className="form-icon"><Icon name="home" size={27} /></div><label>Classroom name<input required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sunshine Sign Stars" /></label><label>A little about your class <span className="optional">(optional)</span><textarea rows="4" maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you learning together?" /></label><div className="form-note"><Icon name="lock" size={17} /><span>A unique invite code will be created for you. Only people with your code can request to join.</span></div><div className="form-actions"><button type="button" className="text-link" onClick={() => onNavigate("/classrooms")}>Cancel</button><Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create classroom"} <span>→</span></Button></div></form></>;
}
