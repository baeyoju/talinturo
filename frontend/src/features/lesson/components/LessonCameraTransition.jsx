import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import algwas from "@/assets/mascots/camera-transition.svg";
import "@/features/onboarding/styles/onboarding.css";
import "@/features/onboarding/styles/onboarding-welcome.css";
import "../styles/camera-transition.css";

// A full-screen step within the current lesson, not another lesson or test page.
// Native modal behavior makes the background inert and contains keyboard focus.
export function LessonCameraTransition({ message, onContinue, onDismiss }) {
  const modal = useRef(null);
  const heading = useRef(null);
  useEffect(() => {
    const dialog = modal.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return <dialog ref={modal} className="camera-transition-dialog onboarding-shell" aria-labelledby="camera-transition-message"
    onCancel={event => { event.preventDefault(); onDismiss(); }}>
    <section className="onboarding-page onboarding-welcome camera-transition" data-transition="camera">
      <div className="onboarding-welcome__main"><div className="onboarding-welcome__scene">
        <h1 ref={heading} id="camera-transition-message" tabIndex="-1" className="onboarding-welcome__bubble">{message}</h1>
        <div className="onboarding-welcome__art" aria-hidden="true"><div className="onboarding-welcome__size"><div className="onboarding-welcome__breathing">
          <img src={algwas} width="409.215" height="514.073" alt="" draggable="false" />
        </div></div></div>
        <div className="onboarding-welcome__shadow" aria-hidden="true" />
      </div></div>
      <footer className="onboarding-actions"><Button type="button" className="onboarding-continue" onClick={onContinue}>I CAN DO IT!</Button></footer>
    </section>
  </dialog>;
}
