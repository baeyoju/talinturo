import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function ChallengeFeedbackPage({ success = false, onNavigate }) {
  return <section className={`feedback-card panel ${success ? "feedback-success" : "feedback-retry"}`}><span className="feedback-icon"><Icon name={success ? "star" : "sprout"} size={34} /></span><p className="eyebrow">{success ? "CHALLENGE COMPLETE" : "EVERY TRY IS PROGRESS"}</p><h1>{success ? "Well done!" : "Keep practicing."}</h1><p>{success ? "Your challenge result has been saved. Continue exploring the published learning content." : "Review the signs and try the published challenge again when you're ready."}</p><div className="result-actions"><Button onClick={() => onNavigate(success ? "/paths" : "/challenge")}>{success ? "Explore learning paths" : "Try the challenge again"} <span>→</span></Button><button className="text-link" onClick={() => onNavigate("/")}>Back to my dashboard</button></div></section>;
}
