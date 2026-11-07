import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";

export function Footer() {
  return <footer className="footer"><span>Made with <b><Icon name="heart" size={13} /></b> for a more inclusive world</span><span>© 2026 Talinturo <i>·</i> <Link to="/help">About</Link> <i>·</i> <Link to="/help">Privacy</Link></span></footer>;
}
