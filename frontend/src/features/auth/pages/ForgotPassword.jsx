import { useState } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return <div className="auth-page"><section className="auth-card panel"><Link to="/" className="auth-brand"><BrandLogo className="brand-logo-auth" /><strong>talinturo</strong></Link><span className="auth-flower"><Icon name="mail" size={24} /></span><p className="eyebrow">A FRESH START</p><h1>{sent ? "Password reset isn't connected yet." : "Forgot your password?"}</h1><p className="auth-description">{sent ? "This local demo has no email delivery configured. Contact your administrator to reset your account." : "It happens! Enter your email to check the reset flow. Email delivery needs to be configured before a link can be sent."}</p>{sent ? <Button className="full-button" onClick={() => window.location.assign("/login")}>Back to sign in</Button> : <form onSubmit={(event) => { event.preventDefault(); setSent(true); }}><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><Button className="full-button" type="submit">Continue <span>→</span></Button></form>}<p className="auth-switch"><Link to="/login">← Back to sign in</Link></p></section><aside className="auth-side"><div className="auth-side-art"><span><Icon name="sprout" size={53} /></span><i><Icon name="sparkles" size={19} /></i><b><Icon name="heart" size={24} /></b></div><h2>One little step<br />at a time.</h2><p>Your learning journey will be right here when you return.</p><span className="auth-side-caption">MADE FOR LEARNERS, FAMILIES & EDUCATORS</span></aside></div>;
}
