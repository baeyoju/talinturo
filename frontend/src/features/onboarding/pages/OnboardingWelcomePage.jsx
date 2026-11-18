import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { Button } from "@/components/ui/Button";
import setupArt from "@/assets/mascots/onboarding-welcome-setup.svg";
import completeArt from "@/assets/mascots/onboarding-welcome-complete.svg";
import { onboardingWelcomeCopy } from "../onboarding-model";
import "../styles/onboarding.css";
import "../styles/onboarding-welcome.css";

// Two Figma welcome screens share presentation, not authentication or completion logic.
export function OnboardingWelcomePage({ stage = "setup", user, onContinue }) {
  const completed = stage === "complete";
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(completed);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const message = useRef(null);

  useEffect(() => {
    if (!completed) return undefined;
    let active = true;
    setLoading(true);
    setError("");
    api("/onboarding")
      .then(result => { if (active) setSaved(result.onboarding); })
      .catch(failure => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [completed, user?.id, retry]);

  useEffect(() => { message.current?.focus({ preventScroll: true }); }, [stage, loading]);

  // A typed URL or refresh cannot manufacture a completed onboarding record.
  if (completed && !loading && !error && !saved?.completed_at) return <Navigate to="/profile/setup" replace />;
  const copy = onboardingWelcomeCopy(stage, saved?.nickname);
  const text = loading ? "Loading your saved learning space…" : error ? "Your saved setup could not be loaded. Please try again." : copy.message;

  return <section className="onboarding-page onboarding-welcome" data-welcome={stage} aria-busy={loading}>
    <div className="onboarding-welcome__main">
      <div className="onboarding-welcome__scene">
        <h1 ref={message} tabIndex="-1" className="onboarding-welcome__bubble" aria-live="polite">{text}</h1>
        <div className="onboarding-welcome__art" aria-hidden="true">
          <div className="onboarding-welcome__size">
            <div className="onboarding-welcome__breathing">
              <img src={completed ? completeArt : setupArt} width="319.883" height="401.85" alt="" draggable="false" />
            </div>
          </div>
        </div>
        <div className="onboarding-welcome__shadow" aria-hidden="true" />
        {error && <p className="onboarding-error" role="alert">{error}</p>}
      </div>
    </div>
    <footer className="onboarding-actions">
      <Button type="button" className="onboarding-continue onboarding-welcome__continue" disabled={loading}
        onClick={error ? () => setRetry(current => current + 1) : onContinue}>
        {loading ? "LOADING…" : error ? "TRY AGAIN" : copy.action}
      </Button>
    </footer>
  </section>;
}
