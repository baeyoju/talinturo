import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const messages = {
  api_unavailable: "The account service is unavailable. Start the Flask API, then try again.",
  not_configured: "Google sign-in isn't configured yet. Add the OAuth client ID and secret to the backend environment.",
  invalid_flow: "That Google sign-in link is invalid. Please try again.",
  start_failed: "Google sign-in couldn't be started. Please try again.",
  account_not_found: "No Talinturo account uses that Google email yet. Choose Create an account to sign up.",
  account_unavailable: "Google couldn't verify the account details required to sign in.",
  cancelled: "Google sign-in was cancelled. You can try again whenever you're ready.",
  callback_failed: "Google sign-in didn't complete. Please try again or use email and password.",
};

// Shows a toast when Google sign-in redirects back with ?oauth_error=...
export function useOAuthErrorToast({ onToast }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const oauthError = new URLSearchParams(location.search).get("oauth_error");
    if (!oauthError) return;
    onToast(messages[oauthError] || "Google sign-in didn't complete. Please try again.");
    const fallbackRoute = location.pathname === "/signup" ? "/signup" : "/login";
    navigate(fallbackRoute, { replace: true });
  }, [location.pathname, location.search, navigate]);
}
