import { useEffect } from "react";

export function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, 3400);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  return message ? <div className="toast" role="status">{message}<button aria-label="Dismiss notification" onClick={onClose}>×</button></div> : null;
}
