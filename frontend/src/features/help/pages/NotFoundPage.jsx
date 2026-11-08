import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function NotFoundPage({ onNavigate }) {
  return <section className="not-found panel"><Icon name="compass" size={44} /><p className="eyebrow">A LITTLE DETOUR</p><h1>We can't find that page.</h1><p>Looks like this path has changed. Let's find another way together.</p><Button onClick={() => onNavigate("/")}>Back to my dashboard <span>→</span></Button></section>;
}
