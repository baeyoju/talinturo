import algwas from "@/assets/mascots/algwas_idle_body.svg";

export function OnboardingMascot({ message, status = "idle" }) {
  return <div className="onboarding-mascot" data-status={status}>
    <p className="onboarding-mascot__bubble" aria-live="polite">{message}</p>
    <div className="onboarding-mascot__anchor"><div className="onboarding-mascot__breathing">
      <img src={algwas} width="138.965" height="190.999" alt="Algwas, your learning companion" draggable="false" />
    </div></div>
  </div>;
}
