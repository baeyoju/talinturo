import { useState } from "react";
import { Link } from "react-router-dom";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/Button";

export function ProfilePage({ user, onSave }) {
  const [name, setName] = useState(user.name);
  const [age, setAge] = useState(user.learner_type);
  const [goal, setGoal] = useState(user.learning_goal);
  const originalName = user.name || "";
  const hasChanges = name.trim() !== originalName.trim()
    || age !== user.learner_type
    || goal !== user.learning_goal;
  const canSave = Boolean(name.trim() && user.email?.trim() && age.trim() && goal.trim() && hasChanges);

  return <><PageTitle eyebrow="THIS IS YOUR SPACE" title="My profile" description="Make your learning space feel a little more like you." /><form className="profile-form panel" onSubmit={(event) => {
    event.preventDefault();
    if (canSave) onSave({ name: name.trim(), learner_type: age, learning_goal: goal });
  }}><div className="profile-edit-head"><span className="avatar avatar-large avatar-mint">{name.split(" ").map((part) => part[0]).slice(0, 2).join("") || "AR"}</span><div><h2>{name || "Your name"}</h2><p>{user.role === "instructor" ? "Instructor account" : "Learner account"}{user.created_at ? ` · Joined ${new Date(user.created_at).toLocaleDateString()}` : ""}</p></div><button type="button" className="button button-outline" onClick={() => document.getElementById("profile-name")?.focus()}>Edit details</button></div><div className="profile-fields"><label>Display name<input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={70} /></label><label>Email address<input type="email" value={user.email || ""} readOnly /></label><label>Learning as<select value={age} onChange={(event) => setAge(event.target.value)}><option>Adult learner</option><option>Child learner</option><option>Parent or caregiver</option><option>Educator</option></select></label><label>My learning goal<select value={goal} onChange={(event) => setGoal(event.target.value)}><option>Everyday conversations</option><option>Connect with family</option><option>Learn for my classroom</option><option>Explore Filipino culture</option></select></label></div><div className="form-actions"><Link className="text-link" to="/settings">Account settings →</Link><Button type="submit" disabled={!canSave}>Save changes</Button></div></form></>;
}
