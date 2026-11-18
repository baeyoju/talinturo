import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { Button } from "@/components/ui/Button";
import { OnboardingMascot } from "../components/OnboardingMascot";
import { OnboardingStepper } from "../components/OnboardingStepper";
import { OnboardingWelcomePage } from "./OnboardingWelcomePage";
import { GOALS, MONTHS, MOTIVATIONS, PROMPTS, SENSORY, STEPS, initialValues, onboardingPayload, validateStep } from "../onboarding-model";
import "../styles/onboarding.css";

function Choices({ options, value, onChange, label }) {
  return <div className="onboarding-choices" role="group" aria-label={label}>
    {options.map(option => <button key={option.value} type="button" className="onboarding-choice" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
      <strong>{option.label}</strong><span>{option.description}</span>
    </button>)}
  </div>;
}

export function ProfileSetupPage({ user, onDone }) {
  const [started, setStarted] = useState(false);
  const [values, setValues] = useState(() => initialValues(user?.name));
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [verifiedClass, setVerifiedClass] = useState(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  const heading = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    api("/onboarding").then(result => {
      if (!active) return;
      setValues(initialValues(user?.name, result.onboarding));
      if (result.onboarding?.class_code) setVerifiedClass({ name: result.onboarding.classroom_name, code: result.onboarding.class_code });
    }).catch(failure => { if (active) setLoadError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, loadAttempt]);

  useEffect(() => { if (started && !loading) heading.current?.focus({ preventScroll: true }); }, [step, loading, started]);

  const update = (field, value) => {
    if (busy.current) return;
    setValues(current => ({ ...current, [field]: value, ...(field === "classCode" ? { noClass: false } : {}) }));
    setError("");
    if (field === "classCode") setVerifiedClass(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (loading || loadError || busy.current) return;
    const invalidStep = step === 6 ? [0, 1, 2, 3, 4, 5].find(index => validateStep(index, values)) : step;
    const validation = validateStep(invalidStep, values);
    if (validation) { setStep(invalidStep); setError(validation); return; }
    if (step !== 4 && step !== 6) { setError(""); setStep(current => current + 1); return; }
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      if (step === 4 && !values.noClass) {
        const checked = await api("/onboarding/classroom", { method: "POST", body: JSON.stringify({ code: values.classCode.trim() }) });
        if (mounted.current) { setVerifiedClass(checked.classroom); setStep(5); }
      } else if (step === 4) {
        setVerifiedClass(null);
        setStep(5);
      } else {
        await onDone(onboardingPayload(values));
      }
    } catch (failure) {
      if (mounted.current) setError(failure.message || "Could not save your profile. Please try again.");
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const back = () => { if (!busy.current) { setError(""); setStep(current => Math.max(0, current - 1)); } };
  const birthday = `${MONTHS[Number(values.month) - 1] || ""} ${values.day}, ${values.year}`;
  const message = loading ? "Sandali lang…" : error ? "Tingnan natin muli. Nandito pa ang mga sagot mo." : saving ? "Sandali lang habang sine-save ang profile mo." : PROMPTS[step];

  if (!started) return <OnboardingWelcomePage user={user} onContinue={() => setStarted(true)} />;

  return <section className="onboarding-page" aria-busy={loading || saving}>
    <header className="onboarding-header"><h1>GETTING STARTED</h1><OnboardingStepper step={step} /></header>
    <form className="onboarding-form" onSubmit={submit} noValidate>
      <div className="onboarding-main" data-step={step}>
        <h2 ref={heading} tabIndex="-1" className="onboarding-sr-only">{STEPS[step]}</h2>
        <OnboardingMascot message={message} status={error || loadError ? "warning" : saving ? "waiting" : "idle"} />
        <div className="onboarding-fields">
          {loading ? <p role="status">Loading your profile…</p> : loadError ? <div role="alert"><p>{loadError}</p><Button type="button" onClick={() => setLoadAttempt(current => current + 1)}>Try again</Button></div> : <>
            {step === 0 && <label htmlFor="onboarding-nickname">Nickname<input id="onboarding-nickname" autoComplete="nickname" maxLength="70" placeholder="Enter your nickname" value={values.nickname} onChange={event => update("nickname", event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "onboarding-error" : undefined} /></label>}
            {step === 1 && <fieldset><legend>Enter your birthdate</legend><div className="onboarding-birthdate">
              <select aria-label="Birth month" value={values.month ? String(Number(values.month)) : ""} onChange={event => update("month", event.target.value)}><option value="">MM</option>{MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select>
              <input aria-label="Birth day" type="number" inputMode="numeric" min="1" max="31" placeholder="DD" value={values.day} onChange={event => update("day", event.target.value)} />
              <input aria-label="Birth year" type="number" inputMode="numeric" min="1" max={new Date().getFullYear()} placeholder="YYYY" value={values.year} onChange={event => update("year", event.target.value)} />
            </div></fieldset>}
            {step === 2 && <Choices options={GOALS} value={values.goal} onChange={value => update("goal", value)} label="Daily practice goal" />}
            {step === 3 && <Choices options={MOTIVATIONS} value={values.motivation} onChange={value => update("motivation", value)} label="Motivation for learning" />}
            {step === 4 && <>
              <div className="onboarding-class-code"><label className="onboarding-sr-only" htmlFor="onboarding-code">Classroom code</label><input id="onboarding-code" value={values.classCode} disabled={saving} maxLength="100" placeholder="e.g. TALI-7K2" onChange={event => update("classCode", event.target.value)} autoComplete="off" spellCheck="false" aria-describedby="onboarding-code-help" /><p id="onboarding-code-help">Ask your teacher for your classroom code.</p></div>
              <div className="onboarding-divider"><span>or</span></div>
              <Button type="button" variant="outline" className="onboarding-skip" disabled={saving} aria-pressed={values.noClass} onClick={() => { setValues(current => ({ ...current, classCode: "", noClass: true })); setVerifiedClass(null); setError(""); }}>I'M NOT ENROLLED</Button>
              <p className="onboarding-class-help">Learn at your own pace. You can join a classroom later.</p>
            </>}
            {step === 5 && <Choices options={SENSORY} value={values.sensory} onChange={value => update("sensory", value)} label="Sensory preference" />}
            {step === 6 && <div className="onboarding-summary"><section><h3>PROFILE</h3><p>{values.nickname}</p></section><section><h3>PREFERENCES</h3><dl>
              <div><dt>Birthdate:</dt><dd>{birthday}</dd></div>
              <div><dt>Goal:</dt><dd>{GOALS.find(option => option.value === values.goal)?.label}</dd></div>
              <div><dt>Motivation:</dt><dd>{values.motivation}</dd></div>
              <div><dt>Class Code:</dt><dd>{values.noClass ? "Not enrolled" : `${verifiedClass?.code || values.classCode}${verifiedClass?.name ? ` · ${verifiedClass.name}` : ""}`}</dd></div>
              <div><dt>Sensory:</dt><dd>{SENSORY.find(option => option.value === values.sensory)?.label}</dd></div>
            </dl></section></div>}
          </>}
          {error && <p id="onboarding-error" className="onboarding-error" role="alert">{error}</p>}
        </div>
      </div>
      <footer className="onboarding-actions">
        {step === 0 ? <Link to="/signup" className="onboarding-back">← BACK</Link> : <button type="button" className="onboarding-back" onClick={back} disabled={saving}>← BACK</button>}
        <Button type="submit" className="onboarding-continue" disabled={loading || saving || Boolean(loadError)}>{saving ? step === 4 ? "CHECKING…" : "SAVING…" : step === 6 ? "FINISH" : "CONTINUE"}</Button>
      </footer>
    </form>
  </section>;
}
