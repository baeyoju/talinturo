import active from "@/assets/mascots/onboarding-active.svg";
import complete from "@/assets/mascots/onboarding-complete.svg";
import { STEPS } from "../onboarding-model";

export function OnboardingStepper({ step }) {
  return <nav className="onboarding-stepper" aria-label="Onboarding progress"><ol>
    {STEPS.map((label, index) => <li key={label} data-state={index < step ? "complete" : index === step ? "current" : "upcoming"} aria-current={index === step ? "step" : undefined}>
      <span className="onboarding-stepper__dot" aria-hidden="true">{index <= step && <img src={index === step ? active : complete} alt="" width={index === step ? 16 : 36} height={index === step ? 16 : 36} />}</span>
      <span>{label}</span><span className="onboarding-sr-only">{index < step ? ": completed" : index === step ? ": current step" : ""}</span>
    </li>)}
  </ol></nav>;
}
