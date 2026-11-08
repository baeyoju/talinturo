import { useState } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function ProfileSetupPage({ onDone }) {
  const [goal, setGoal] = useState("Connect with family");
  const [learnerType, setLearnerType] = useState("Adult learner");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onDone({ learner_type: learnerType, learning_goal: goal });
    } catch (saveError) {
      setError(`Couldn't save your profile: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  return <div className="auth-page"><section className="auth-card panel"><Link to="/" className="auth-brand"><BrandLogo className="brand-logo-auth" /><strong>talinturo</strong></Link><span className="auth-flower"><Icon name="sprout" size={24} /></span><p className="eyebrow">LET'S MAKE THIS YOURS</p><h1>What brings you here?</h1><p className="auth-description">We'll use this to make your learning journey feel a little more personal.</p><form onSubmit={submit}><label>My learning goal<select value={goal} onChange={(event) => setGoal(event.target.value)}><option>Connect with family</option><option>Everyday conversations</option><option>Learn for my classroom</option><option>Explore Filipino culture</option></select></label><label>I'm learning as<select value={learnerType} onChange={(event) => setLearnerType(event.target.value)}><option>Adult learner</option><option>Child learner</option><option>Parent or caregiver</option><option>Educator</option></select></label>{error && <p className="inline-error" role="alert">{error}</p>}<Button className="full-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Let's get started"} <span>→</span></Button></form></section><aside className="auth-side"><div className="auth-side-art"><span><Icon name="globe" size={53} /></span><i><Icon name="sparkles" size={19} /></i><b><Icon name="heart" size={24} /></b></div><h2>Your story.<br />Your pace.</h2><p>There is no one way to learn. We'll meet you right where you are.</p><span className="auth-side-caption">MADE FOR LEARNERS, FAMILIES & EDUCATORS</span></aside></div>;
}
