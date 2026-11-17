import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { Button } from "@/components/ui/Button";
import loginMascot from "@/assets/mascots/auth-login.svg";
import signupMascot from "@/assets/mascots/auth-signup.svg";
import { learnerAuthPayload, signupPasswordError } from "../auth-model";
import "../../onboarding/styles/onboarding.css";
import "../styles/auth.css";

export function LearnerAuthPage({ mode, onAuth }) {
  // A route change remounts the form, clears secrets/errors and aborts its requests.
  return <LearnerAuthForm key={mode} mode={mode} onAuth={onAuth} />;
}

function LearnerAuthForm({ mode, onAuth }) {
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pending.current?.abort(); };
  }, []);

  async function request(google = false) {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError("");
    try {
      if (google) {
        await api("/health", { signal: controller.signal });
        if (mounted.current && !controller.signal.aborted) window.location.assign(`/api/auth/google?flow=${mode}`);
      } else {
        const result = await api(`/auth/${mode}`, {
          method: "POST", signal: controller.signal,
          body: JSON.stringify(learnerAuthPayload(mode, email, password)),
        });
        if (!result.user) throw new Error("The account service did not confirm your account. Please try again.");
        if (mounted.current && !controller.signal.aborted) onAuth(result.user);
      }
    } catch (failure) {
      if (mounted.current && !controller.signal.aborted) setError(failure.message || "The account service is unavailable. Please try again.");
    } finally {
      if (pending.current === controller) pending.current = null;
      if (mounted.current) setLoading(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    const message = isSignup ? signupPasswordError(password, confirmation) : "";
    if (message) { setError(message); return; }
    void request();
  }

  return <main className={`fsl-auth ${isSignup ? "fsl-auth--signup" : ""}`} aria-label={isSignup ? "Sign up" : "Log in"}>
    <div className="fsl-auth__layout">
      <aside className="fsl-auth__mascot" aria-label="Algwas welcomes you">
        <p className="fsl-auth__bubble">{isSignup ? "Welcome!" : "Welcome back!"}</p>
        <div className="fsl-auth__art"><div className="fsl-auth__scale"><div className="fsl-auth__breathing">
          <img src={isSignup ? signupMascot : loginMascot} width="292.645" height="372.602" alt="Algwas smiling" draggable="false" />
        </div></div></div>
        <span className="fsl-auth__shadow" aria-hidden="true" />
      </aside>
      <section className="fsl-auth__card" aria-label={isSignup ? "Create your account" : "Sign in to your account"}>
        <form onSubmit={submit} aria-busy={loading}>
          <label htmlFor="auth-email">Email<input id="auth-email" type="email" autoComplete="email" required maxLength={254} placeholder="example@gmail.com" value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label htmlFor="auth-password">Password<input id="auth-password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} required minLength={8} maxLength={128} placeholder="Min of 8 characters" value={password} onChange={event => setPassword(event.target.value)} /></label>
          {isSignup && <label htmlFor="auth-confirmation">Confirm Password<input id="auth-confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Min of 8 characters" aria-invalid={Boolean(error && password !== confirmation)} aria-describedby={error ? "auth-error" : undefined} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>}
          <p className="fsl-auth__forgot">Forgot Password? <Link to="/forgot-password">Click here</Link></p>
          {error && <p id="auth-error" className="fsl-auth__error" role="alert">{error}</p>}
          <Button className="fsl-auth__submit" type="submit" disabled={loading}>{loading ? "One moment…" : isSignup ? "SIGN UP" : "LOG IN"}</Button>
          <p className="fsl-auth__switch">{isSignup ? "Already have an account? " : "Don’t have an account yet? "}<Link to={isSignup ? "/login" : "/signup"}>{isSignup ? "Log In" : "Sign up"}</Link></p>
        </form>
        <div className="fsl-auth__alternative"><div className="fsl-auth__divider"><span>or</span></div>
          <Button type="button" variant="outline" className="fsl-auth__google" disabled={loading} onClick={() => void request(true)}>{isSignup ? "SIGN UP WITH GOOGLE" : "LOG IN WITH GOOGLE"}</Button>
        </div>
      </section>
    </div>
  </main>;
}
