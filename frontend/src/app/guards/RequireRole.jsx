import { Navigate } from "react-router-dom";
import { roleHome } from "@/constants/navigation";

// Renders children only for `allow`; everyone else goes to `fallback` (default: their own home).
export function RequireRole({ role, allow, fallback, children }) {
  if (role !== allow) return <Navigate to={fallback ?? roleHome(role)} replace />;
  return children;
}
