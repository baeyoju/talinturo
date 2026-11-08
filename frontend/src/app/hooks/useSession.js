import { useEffect, useState } from "react";
import { api } from "@/adapters/http/api";

export function useSession({ onToast }) {
  const [role, setRole] = useState(localStorage.getItem("talinturo-role") || "learner");
  const [user, setUser] = useState(() => ({
    name: localStorage.getItem("talinturo-name") || "Alex Rivera",
    email: role === "instructor" ? "teacher@example.com" : "learner@example.com",
    role,
    learner_type: "Adult learner",
    learning_goal: "Everyday conversations",
  }));
  const [demoMode, setDemoMode] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(null);

  // Restore the session from the cookie on first load.
  useEffect(() => {
    let active = true;
    api("/auth/me")
      .then((result) => {
        if (!active) return;
        setApiOnline(true);
        setIsAuthenticated(true);
        setDemoMode(result.demo_mode === true);
        setRole(result.user.role);
        localStorage.setItem("talinturo-role", result.user.role);
        localStorage.setItem("talinturo-name", result.user.name);
        setUser(result.user);
      })
      .catch(() => {
        if (active) setApiOnline(false);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => { active = false; };
  }, []);

  // Streak shown in the sidebar and top bar (not for admins).
  useEffect(() => {
    if (!isAuthenticated || !user.id || role === "admin") {
      setCurrentStreak(null);
      return undefined;
    }
    let active = true;
    api("/dashboard")
      .then((summary) => {
        if (active) setCurrentStreak(summary.learning_streak);
      })
      .catch(() => {
        if (active) setCurrentStreak(null);
      });
    return () => { active = false; };
  }, [isAuthenticated, user.id, role]);

  const acceptAuth = (account) => {
    setApiOnline(true);
    localStorage.setItem("talinturo-name", account.name);
    localStorage.setItem("talinturo-role", account.role);
    setRole(account.role);
    setUser(account);
    setIsAuthenticated(true);
  };

  const switchDemoRole = async (nextRole) => {
    setRole(nextRole);
    localStorage.setItem("talinturo-role", nextRole);
    setUser((current) => ({ ...current, role: nextRole }));
    try {
      const result = await api("/auth/demo", { method: "POST", body: JSON.stringify({ role: nextRole }) });
      localStorage.setItem("talinturo-name", result.user.name);
      setUser(result.user);
    } catch (error) {
      onToast(`Couldn't switch demo role: ${error.message}`);
    }
  };

  // Returns true when sign-out succeeded.
  const signOut = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (error) {
      onToast(`Could not sign out: ${error.message}`);
      return false;
    }
    localStorage.removeItem("talinturo-name");
    setIsAuthenticated(false);
    setUser({ name: "Alex Rivera", role });
    return true;
  };

  return { role, user, setUser, demoMode, currentStreak, isAuthenticated, authLoading, apiOnline, acceptAuth, switchDemoRole, signOut };
}
