import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";

export function ResetPassword() {
  return <section className="not-found panel"><Icon name="lock" size={44} /><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Password reset isn't configured.</h1><p>This local demo has no email delivery or reset-token service. Ask your administrator for help, or return to sign in.</p><Link className="button button-primary" to="/login">Back to sign in <span>→</span></Link></section>;
}
