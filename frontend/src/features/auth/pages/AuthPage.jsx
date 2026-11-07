import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

// One page for learner sign-in, sign-up and instructor sign-in (via the `mode` / `instructorMode` props).
export function AuthPage({ mode, onAuth, onToast, instructorMode = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api(`/auth/${isSignup ? "signup" : "login"}`, { method: "POST", body: JSON.stringify({ email, password, name, ...(instructorMode ? { expected_role: "instructor" } : {}) }) });
      onAuth(result.user);
    } catch (error) {
      onToast(`Couldn't ${isSignup ? "create your account" : "sign in"}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startGoogleAuth = async () => {
    setLoading(true);
    try {
      await api("/health");
      window.location.assign(`/api/auth/google?flow=${mode}`);
    } catch (error) {
      onToast(`Couldn't reach the account service. Start the Flask API and try again. ${error.message}`);
      setLoading(false);
    }
  };

  return <div className={`auth-page ${!isSignup ? "login-auth-page" : ""} ${instructorMode ? "instructor-auth-page" : ""}`}><section className="auth-card panel"><Link to="/" className="auth-brand"><BrandLogo className="brand-logo-auth" /><strong>talinturo</strong></Link><span className="auth-flower"><Icon name={instructorMode ? "school" : "sparkles"} size={24} /></span><p className="eyebrow">{instructorMode ? "INSTRUCTOR PORTAL" : isSignup ? "YOUR FSL JOURNEY STARTS HERE" : "WELCOME BACK"}</p><h1>{instructorMode ? "Welcome back, educator." : isSignup ? "Let's make a little progress." : "It's nice to see you."}</h1><p className="auth-description">{instructorMode ? "Sign in to support your learners, manage classrooms, and keep every lesson moving." : isSignup ? "Create your learning space. Go at your pace, and celebrate every sign." : "Sign in and keep your learning journey going."}</p><form onSubmit={submit}>{isSignup && <label>Your name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={70} autoComplete="name" placeholder="How should we call you?" /></label>}<label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="email" placeholder="you@example.com" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={128} autoComplete={isSignup ? "new-password" : "current-password"} placeholder="At least 8 characters" /></label>{!isSignup && <Link className="forgot-link" to="/forgot-password">Forgot password?</Link>}<Button className="full-button" type="submit" disabled={loading}>{loading ? "One moment…" : isSignup ? "Create my account" : instructorMode ? "Sign in as instructor" : "Sign in"} <span>→</span></Button></form>{!instructorMode && <><div className="auth-divider"><span>or</span></div><Button variant="outline" className="full-button" disabled={loading} onClick={startGoogleAuth}>{loading ? "Connecting…" : `◎ ${isSignup ? "Sign up with Google" : "Continue with Google"}`}</Button></>}<p className="auth-switch">{instructorMode ? <>Learner? <Link to="/login">Sign in here</Link></> : isSignup ? "Already learning with us?" : "New to Talinturo?"} {!instructorMode && <Link to={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link>}</p>{!instructorMode && <p className="auth-oauth-note">Google securely verifies your email. {isSignup ? "Your account will be created after verification." : "Use the Google account linked to your Talinturo account."}</p>}</section><aside className="auth-side"><div className="auth-side-art"><span><Icon name="hand" size={53} /></span><i><Icon name="sparkles" size={19} /></i><b><Icon name="heart" size={24} /></b></div><h2>{instructorMode ? <>Teach with<br />connection.</> : <>Small signs.<br />Big connections.</>}</h2><p>{instructorMode ? "Create a learning space where every learner can move forward with confidence." : "Build a more inclusive world, one kind conversation at a time."}</p><span className="auth-side-caption">MADE FOR LEARNERS, FAMILIES & EDUCATORS</span></aside></div>;
}
