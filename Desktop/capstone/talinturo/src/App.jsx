import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from "framer-motion";
import { api, getPendingApiRequests, subscribeToApiLoading } from "./api.js";
import ConnieLoader from "./ConnieLoader.jsx";
import AdminWorkspace from "./AdminWorkspace.jsx";

const learnerNav = [
  { heading: "LEARN" },
  { label: "Dashboard", to: "/", icon: "home" },
  { label: "Learning paths", to: "/paths", icon: "bookOpen" },
  { label: "FSL vocabulary", to: "/vocabulary", icon: "book" },
  { label: "Sign practice", to: "/practice", icon: "hand" },
  { label: "Scenarios", to: "/scenarios", icon: "message" },
  { heading: "YOUR JOURNEY" },
  { label: "Classrooms", to: "/classrooms", icon: "school" },
  { label: "My progress", to: "/progress", icon: "star" },
  { label: "Level challenge", to: "/challenge", icon: "sparkles" },
];

const instructorNav = [
  { heading: "TEACH" },
  { label: "Instructor dashboard", to: "/instructor", icon: "home" },
  { label: "Learners", to: "/learners", icon: "users" },
  { label: "Virtual classrooms", to: "/classrooms", icon: "school" },
  { heading: "YOUR ACCOUNT" },
  { label: "My progress", to: "/progress", icon: "star" },
];

const adminNav = [
  { heading: "ADMINISTRATION" },
  { label: "Overview", to: "/admin", icon: "home" },
];

function roleHome(role) {
  return role === "admin" ? "/admin" : role === "instructor" ? "/instructor" : "/";
}

const PageMotionContext = createContext(false);
const introTextVariants = (reduceMotion) => ({
  hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] } },
});

const iconArtwork = {
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16M8 7h8M8 11h8" /></>,
  bookOpen: <><path d="M12 7v14M12 7C9.5 4.5 6.5 4 3 4v14c3.5 0 6.5.5 9 3M12 7c2.5-2.5 5.5-3 9-3v14c-3.5 0-6.5.5-9 3" /></>,
  brain: <><path d="M12 5a3 3 0 0 0-5.8-1 3.5 3.5 0 0 0-2.1 5.8 3.5 3.5 0 0 0 1 5.8A3 3 0 0 0 8 20a3 3 0 0 0 4-2.8z" /><path d="M12 5a3 3 0 0 1 5.8-1 3.5 3.5 0 0 1 2.1 5.8 3.5 3.5 0 0 1-1 5.8A3 3 0 0 1 16 20a3 3 0 0 1-4-2.8M8 8h.01M7 14h.01M16 8h.01M17 14h.01M9 11h.01M15 11h.01" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  sparkles: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 14l1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1zM5 2l.8 2.2L8 5l-2.2.8L5 8l-.8-2.2L2 5l2.2-.8z" /></>,
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" /></>,
  school: <><path d="m3 9 9-5 9 5-9 5zM5 11v6c4.5 3 9.5 3 14 0v-6M21 9v7" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
  lifeBuoy: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="m5.6 5.6 4.3 4.3m4.2 4.2 4.3 4.3m0-12.8-4.3 4.3m-4.2 4.2-4.3 4.3" /></>,
  sprout: <><path d="M12 21v-9M12 13c0-5 3-8 8-8 0 5-3 8-8 8zM12 16c0-4-2.5-6-7-6 0 4.5 2.5 6 7 6z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
  moon: <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.6 8.6 0 1 0 11 11z" />,
  flame: <><path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-2-1-3-3-3-5-3 3-4 6-4 9a7 7 0 0 0 7 7z" /><path d="M12 22a3 3 0 0 0 3-3c0-1.5-1-2.5-2-4-1 1-2 2-2 4a1 1 0 0 0 1 3z" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />,
  heart: <path d="M20.8 8.8c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10a4.5 4.5 0 0 1 8.8-1.3 4.5 4.5 0 0 1 8.8 1.3z" />,
  hand: <><path d="M8 11V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6l.5-2a1.5 1.5 0 0 1 3 .5l-1.2 6.2A6.5 6.5 0 0 1 13 21h-1a6 6 0 0 1-4.8-2.4L4 14.5A1.5 1.5 0 0 1 6.4 13z" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" /></>,
  lightbulb: <><path d="M9 18h6m-5 3h4m-2-20a7 7 0 0 0-4 12.7c.8.6 1 1.4 1 2.3h6c0-.9.2-1.7 1-2.3A7 7 0 0 0 12 1z" /></>,
  message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  volume: <><path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" /><path d="m9 12 2 2 4-4" /></>,
  compass: <><circle cx="12" cy="12" r="10" /><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z" /></>,
  store: <><path d="M3 10h18l-1.5-6h-15zM5 10v10h14V10M9 20v-6h6v6" /><path d="M3 10a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" /></>,
  camera: <><path d="M14 5h-4l-2 2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3" /></>,
};

function Icon({ name, size = 20, className = "" }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{iconArtwork[name]}</svg>;
}

function BrandLogo({ className = "" }) {
  return <img className={`brand-logo ${className}`} src="/talinturo-logo.png" alt="" />;
}

function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, 3400);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  return message ? <div className="toast" role="status">{message}<button aria-label="Dismiss notification" onClick={onClose}>×</button></div> : null;
}

function App() {
  const prefersReducedMotion = useReducedMotion();
  const [role, setRole] = useState(localStorage.getItem("talinturo-role") || "learner");
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("talinturo-settings");
    const savedSettings = saved ? JSON.parse(saved) : {};
    return {
      sound: true,
      reducedMotion: false,
      weekly: false,
      themeMode: savedSettings.themeMode === "dark" ? "dark" : "light",
      ...(typeof savedSettings.sound === "boolean" ? { sound: savedSettings.sound } : {}),
      ...(typeof savedSettings.reducedMotion === "boolean" ? { reducedMotion: savedSettings.reducedMotion } : {}),
      ...(typeof savedSettings.weekly === "boolean" ? { weekly: savedSettings.weekly } : {}),
    };
  });
  const [user, setUser] = useState({
    name: localStorage.getItem("talinturo-name") || "Alex Rivera",
    email: role === "instructor" ? "teacher@example.com" : "learner@example.com",
    role,
    learner_type: "Adult learner",
    learning_goal: "Everyday conversations",
  });
  const [demoMode, setDemoMode] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState(null);
  const workspaceRef = useRef(null);
  const topbarRef = useRef(null);
  const pendingApiRequests = useSyncExternalStore(subscribeToApiLoading, getPendingApiRequests, getPendingApiRequests);
  const location = useLocation();
  const navigate = useNavigate();
  const previousPathnameRef = useRef(location.pathname);

  useEffect(() => {
    const workspace = workspaceRef.current;
    const topbar = topbarRef.current;
    if (!workspace || !topbar) return undefined;

    const updateSidebarOffset = () => {
      workspace.style.setProperty("--workspace-header-height", `${topbar.getBoundingClientRect().height}px`);
    };
    const observer = new ResizeObserver(updateSidebarOffset);
    observer.observe(topbar);
    updateSidebarOffset();
    return () => observer.disconnect();
  }, [isAuthenticated]);

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

  useEffect(() => {
    if (!isAuthenticated || !user.id) return undefined;
    let active = true;
    api("/preferences")
      .then(({ preferences }) => {
        if (!active) return;
        const savedSettings = {
          themeMode: preferences.theme_mode === "dark" ? "dark" : "light",
          sound: Boolean(preferences.sound),
          reducedMotion: Boolean(preferences.reduced_motion),
          weekly: Boolean(preferences.weekly_summary),
        };
        setSettings(savedSettings);
        localStorage.setItem("talinturo-settings", JSON.stringify(savedSettings));
      })
      .catch((error) => {
        if (active) setToast(`Couldn't load your saved preferences: ${error.message}`);
      });
    return () => { active = false; };
  }, [isAuthenticated, user.id]);

  useEffect(() => {
    setMenuOpen(false);
    const oauthError = new URLSearchParams(location.search).get("oauth_error");
    if (oauthError) {
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
      setToast(messages[oauthError] || "Google sign-in didn't complete. Please try again.");
      const fallbackRoute = location.pathname === "/signup" ? "/signup" : "/login";
      navigate(fallbackRoute, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const pathnameChanged = previousPathnameRef.current !== location.pathname;
    previousPathnameRef.current = location.pathname;
    if (!pathnameChanged || !sidebarOpen) return undefined;

    setSidebarOpen(false);
    return undefined;
  }, [location.pathname, sidebarOpen]);

  const changeRole = async (nextRole) => {
    setRole(nextRole);
    localStorage.setItem("talinturo-role", nextRole);
    setUser((current) => ({ ...current, role: nextRole }));
    try {
      const result = await api("/auth/demo", { method: "POST", body: JSON.stringify({ role: nextRole }) });
      localStorage.setItem("talinturo-name", result.user.name);
      setUser(result.user);
    } catch (error) {
      setToast(`Couldn't switch demo role: ${error.message}`);
    }
    navigate(nextRole === "instructor" ? "/instructor" : "/");
  };

  const signOut = async () => {
    setSidebarOpen(false);
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (error) {
      setToast(`Could not sign out: ${error.message}`);
      return;
    }
    localStorage.removeItem("talinturo-name");
    setIsAuthenticated(false);
    setUser({ name: "Alex Rivera", role });
    setToast("You have been signed out.");
    navigate("/");
  };

  const acceptAuth = (account) => {
    setApiOnline(true);
    localStorage.setItem("talinturo-name", account.name);
    localStorage.setItem("talinturo-role", account.role);
    setRole(account.role);
    setUser(account);
    setIsAuthenticated(true);
  };

  const savePreferences = async (nextSettings) => {
    try {
      const result = await api("/preferences", {
        method: "PUT",
        body: JSON.stringify({
          theme_mode: nextSettings.themeMode,
          sound: nextSettings.sound,
          reduced_motion: nextSettings.reducedMotion,
          weekly_summary: nextSettings.weekly,
        }),
      });
      const savedSettings = {
        themeMode: result.preferences.theme_mode,
        sound: Boolean(result.preferences.sound),
        reducedMotion: Boolean(result.preferences.reduced_motion),
        weekly: Boolean(result.preferences.weekly_summary),
      };
      setSettings(savedSettings);
      localStorage.setItem("talinturo-settings", JSON.stringify(savedSettings));
      setToast("Your preferences have been saved to your account.");
    } catch (error) {
      setToast(`Couldn't save your preferences: ${error.message}`);
    }
  };

  const appStyle = {
    "--green": settings.themeMode === "dark" ? "#a9bcff" : "#1e40c2",
    "--green-dark": settings.themeMode === "dark" ? "#8ba5ff" : "#1835a0",
    "--green-soft": settings.themeMode === "dark" ? "#293456" : "#e8edff",
    "--canvas": settings.themeMode === "dark" ? "#17191f" : "#f7f1e5",
    "--ink": settings.themeMode === "dark" ? "#f4f1eb" : "#383737",
    "--ink-shadow": "none",
    "--muted": settings.themeMode === "dark" ? "#b1b2b8" : "#807a71",
    "--muted-shadow": "none",
  };
  const onboardingInProgress = location.pathname === "/profile/setup";
  const shouldReduceMotion = prefersReducedMotion || settings.reducedMotion;

  if (authLoading) {
    return <div className="app-shell public-shell" data-reduced-motion={shouldReduceMotion} style={appStyle}><div className="public-loading">Getting your learning space ready…</div><ConnieLoader active={pendingApiRequests > 0} /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell public-shell" data-reduced-motion={shouldReduceMotion} style={appStyle}>
        <Routes>
          <Route path="/" element={<LandingPage onNavigate={navigate} onAuth={acceptAuth} onToast={setToast} />} />
          <Route path="/welcome" element={<LandingPage onNavigate={navigate} onAuth={acceptAuth} onToast={setToast} />} />
          <Route path="/login" element={<AuthPage mode="login" onAuth={(account) => { acceptAuth(account); navigate(roleHome(account.role)); }} onToast={setToast} />} />
          <Route path="/instructor/sign-in" element={<AuthPage mode="login" instructorMode onAuth={(account) => { acceptAuth(account); navigate(roleHome(account.role)); }} onToast={setToast} />} />
          <Route path="/signup" element={<AuthPage mode="signup" onAuth={(account) => { acceptAuth(account); navigate("/profile/setup"); }} onToast={setToast} />} />
          <Route path="/forgot-password" element={<ForgotPassword onToast={setToast} />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ConnieLoader active={pendingApiRequests > 0} />
        <Toast message={toast} onClose={() => setToast("")} />
      </div>
    );
  }

  return (
    <div ref={workspaceRef} className={`app-shell workspace-shell ${sidebarOpen && !onboardingInProgress ? "navigation-open" : ""}`} data-theme={settings.themeMode} data-reduced-motion={shouldReduceMotion} style={appStyle}>
      {!onboardingInProgress && <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-profile">
          <div className="avatar avatar-mint">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
          <div><strong>{user.name}</strong><span>{role === "admin" ? "Administrator account" : role === "instructor" ? "Instructor account" : "Learner account"}</span></div>
          <span className="online-dot" />
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {(role === "admin" ? adminNav : role === "instructor" ? instructorNav : learnerNav).map((item, index) =>
            item.heading ? <p className="nav-heading" key={item.heading}>{item.heading}</p> :
              <NavLink key={`${item.to}-${index}`} to={item.to} end={item.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "nav-active" : ""}`}>
                <span className="nav-icon"><Icon name={item.icon} size={19} /></span><span>{item.label}</span>
              </NavLink>,
          )}
        </nav>
        <div className="sidebar-bottom">
          {currentStreak !== null && <div className="sidebar-streak"><Icon name="flame" size={22} /><div><strong>{currentStreak} day streak</strong><small>{currentStreak ? "You're on a roll!" : "Start a practice activity"}</small></div><span className="streak-sparkle">✦</span></div>}
          <Link className="nav-link" to="/help"><span className="nav-icon">?</span><span>Help & about</span></Link>
          <button className="sidebar-account" onClick={() => navigate("/profile")}><span className="avatar avatar-small">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{user.name}</strong><small>View profile</small></span><span className="account-dots">···</span></button>
        </div>
      </aside>}
      <div className="main-column">
        <header ref={topbarRef} className="topbar">
          <div className="breadcrumb">
            <Link className="header-brand" to="/" aria-label="Talinturo home">
              <BrandLogo className="brand-logo-header" />
              <span className="header-brand-name">talinturo<small>FSL, one sign at a time</small></span>
            </Link>
            <b>/</b>
            <strong>{pageTitle(location.pathname)}</strong>
            {!onboardingInProgress && <button
              className="sidebar-toggle"
              type="button"
              aria-label={sidebarOpen ? "Hide navigation" : "Show navigation"}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                <path d="M9 5v14" />
                <path d={sidebarOpen ? "m15 9-3 3 3 3" : "m13 9 3 3-3 3"} />
              </svg>
            </button>}
          </div>
          <div className="top-actions">
            {apiOnline === false && <span className="api-status"><i /> API offline</span>}
            {currentStreak !== null && <span className="streak-top" aria-label="Current streak"><Icon name="flame" size={17} /> {currentStreak} <small>day streak</small></span>}
            {demoMode && <button className="role-switch" onClick={() => changeRole(role === "instructor" ? "learner" : "instructor")}>{role === "instructor" ? "Learner view" : "Instructor view"} <span>↗</span></button>}
            <div className="profile-menu-wrap">
              <button className="top-profile" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}><span className="avatar avatar-small">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span>{user.name.split(" ")[0]}</span></button>
              {menuOpen && <div className="profile-menu">
                <Link to="/profile" onClick={() => setSidebarOpen(false)}>My profile</Link>
                <Link to="/settings" onClick={() => setSidebarOpen(false)}>Settings</Link>
                <button onClick={signOut}>Sign out</button>
              </div>}
            </div>
          </div>
        </header>
        <LazyMotion features={domAnimation}>
          <PageMotionContext.Provider value={shouldReduceMotion}>
          <AnimatePresence mode="wait">
            <m.main
              key={location.pathname}
              className="content"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: "easeOut" }}
            >
            <Routes>
            <Route path="/" element={role === "admin" ? <Navigate to="/admin" replace /> : <Dashboard user={user} onNavigate={navigate} />} />
            <Route path="/admin" element={role === "admin" ? <AdminWorkspace user={user} /> : <Navigate to={roleHome(role)} replace />} />
            <Route path="/paths" element={<LearningPaths onNavigate={navigate} />} />
            <Route path="/paths/:pathId/lessons/:lessonId" element={<LessonViewer onNavigate={navigate} />} />
            <Route path="/paths/:pathId" element={<LearningPathDetails onNavigate={navigate} reducedMotion={settings.reducedMotion} />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="/practice" element={<Practice onToast={setToast} />} />
            <Route path="/scenarios" element={<Scenarios onNavigate={navigate} />} />
            <Route path="/activity" element={<Navigate to="/scenarios" replace />} />
            <Route path="/activity/:activityId" element={<ScenarioActivity onNavigate={navigate} />} />
            <Route path="/results" element={<ActivityResults onNavigate={navigate} />} />
            <Route path="/challenge" element={<Challenge onNavigate={navigate} onToast={setToast} />} />
            <Route path="/challenge/success" element={<ChallengeFeedback success onNavigate={navigate} />} />
            <Route path="/challenge/try-again" element={<ChallengeFeedback onNavigate={navigate} />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/instructor" element={role === "instructor" ? <InstructorDashboard user={user} onNavigate={navigate} /> : <Navigate to={roleHome(role)} replace />} />
            <Route path="/learners" element={role === "instructor" ? <LearnerManagement onNavigate={navigate} /> : <Navigate to={roleHome(role)} replace />} />
            <Route path="/learners/:id" element={role === "instructor" ? <LearnerDetails /> : <Navigate to={roleHome(role)} replace />} />
            <Route path="/classrooms" element={role === "instructor" ? <Classrooms onNavigate={navigate} /> : <LearnerClassrooms onToast={setToast} />} />
            <Route path="/classrooms/create" element={role === "instructor" ? <CreateClassroom onNavigate={navigate} onToast={setToast} /> : <Navigate to="/classrooms" replace />} />
            <Route path="/classrooms/:id/students" element={role === "instructor" ? <AddStudents onNavigate={navigate} onToast={setToast} demoMode={demoMode} /> : <Navigate to="/classrooms" replace />} />
            <Route path="/profile" element={<Profile user={user} onSave={async (name) => {
              try {
                const profile = await api("/profile", { method: "PUT", body: JSON.stringify(name) });
                setUser(profile.user);
                localStorage.setItem("talinturo-name", profile.user.name);
                setToast("Profile updated!");
              } catch (error) {
                setToast(`Couldn't update your profile: ${error.message}`);
              }
            }} />} />
            <Route path="/settings" element={<Settings settings={settings} setSettings={setSettings} onSave={savePreferences} onToast={setToast} />} />
            <Route path="/help" element={<Help />} />
            <Route path="/login" element={<AuthPage mode="login" onAuth={(account) => { acceptAuth(account); navigate(roleHome(account.role)); }} onToast={setToast} />} />
            <Route path="/instructor/sign-in" element={<Navigate to="/instructor" replace />} />
            <Route path="/signup" element={<AuthPage mode="signup" onAuth={(account) => { acceptAuth(account); navigate("/profile/setup"); }} onToast={setToast} />} />
            <Route path="/profile/setup" element={<ProfileSetup onDone={async (profile) => {
              const result = await api("/profile", {
                method: "PUT",
                body: JSON.stringify({ name: user.name, ...profile }),
              });
              setUser(result.user);
              localStorage.setItem("talinturo-name", result.user.name);
              navigate("/");
            }} />} />
            <Route path="/forgot-password" element={<ForgotPassword onToast={setToast} />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/welcome" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound onNavigate={navigate} />} />
            </Routes>
            </m.main>
          </AnimatePresence>
          </PageMotionContext.Provider>
        </LazyMotion>
        <footer className="footer"><span>Made with <b><Icon name="heart" size={13} /></b> for a more inclusive world</span><span>© 2026 Talinturo <i>·</i> <Link to="/help">About</Link> <i>·</i> <Link to="/help">Privacy</Link></span></footer>
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
      <ConnieLoader active={pendingApiRequests > 0} />
    </div>
  );
}

function pageTitle(path) {
  if (path.startsWith("/paths/")) return "Learning path";
  if (path.startsWith("/learners/")) return "Learner details";
  if (path.startsWith("/classrooms/create")) return "Create classroom";
  if (/^\/classrooms\/\d+\/students$/.test(path)) return "Add students";
  if (path.startsWith("/challenge/")) return "Challenge results";
  const found = [...learnerNav, ...instructorNav, ...adminNav].find((item) => item.to === path);
  const titles = { "/activity": "Scenario activity", "/results": "Activity results", "/profile": "My profile", "/settings": "Settings", "/help": "Help & about", "/login": "Welcome", "/welcome": "Welcome", "/signup": "Create account", "/forgot-password": "Reset password", "/reset-password": "Reset password", "/profile/setup": "Set up your profile" };
  return found?.label || titles[path] || "Not found";
}

function PageTitle({ eyebrow, title, description, action }) {
  const reduceMotion = useContext(PageMotionContext);
  const textVariants = introTextVariants(reduceMotion);
  const variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.075, delayChildren: reduceMotion ? 0 : 0.04 } },
  };
  return <m.div className="page-title" variants={variants} initial={reduceMotion ? false : "hidden"} animate="visible">
    <div>
      {eyebrow && <m.p className="eyebrow" variants={textVariants}>{eyebrow}</m.p>}
      <m.h1 variants={textVariants}>{title}</m.h1>
      {description && <m.p className="page-description" variants={textVariants}>{description}</m.p>}
    </div>
    {action && <m.div variants={textVariants}>{action}</m.div>}
  </m.div>;
}

function Button({ children, variant = "primary", className = "", ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

function ProgressBar({ value, color = "green" }) {
  return <div className={`progress-track progress-${color}`}><span style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}

function LandingPage({ onNavigate, onAuth, onToast }) {
  const [signup, setSignup] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const landingRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    const landing = landingRef.current;
    const header = headerRef.current;
    if (!landing || !header) return undefined;

    let frame = 0;
    const updateHeader = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const headerHeight = header.getBoundingClientRect().height;
        landing.style.setProperty("--landing-header-height", `${headerHeight}px`);
        const sections = [...landing.querySelectorAll(".landing-hero, .landing-join, .landing-about, .landing-learners, .landing-team, .landing-contact")];
        const section = sections.find((item) => {
          const bounds = item.getBoundingClientRect();
          return bounds.top <= headerHeight + 1 && bounds.bottom > headerHeight + 1;
        }) || sections.reduce((closest, item) => {
          if (!closest) return item;
          const distance = Math.abs(item.getBoundingClientRect().top - headerHeight);
          return distance < Math.abs(closest.getBoundingClientRect().top - headerHeight) ? item : closest;
        }, null);
        if (!section) return;

        const background = getComputedStyle(section).backgroundColor;
        const channels = background.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [247, 241, 229];
        const brightness = (channels[0] * 299 + channels[1] * 587 + channels[2] * 114) / 1000;
        header.style.backgroundColor = background;
        header.dataset.theme = brightness < 150 ? "dark" : "light";
        const activeLink = section.id === "home" ? "home" : section.id === "contact" ? "contact" : "about";
        header.querySelectorAll("nav a").forEach((link) => {
          const active = link.getAttribute("href") === `#${activeLink}`;
          link.classList.toggle("public-nav-active", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateHeader);
      window.removeEventListener("resize", updateHeader);
    };
  }, []);

  const createAccount = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api("/auth/signup", { method: "POST", body: JSON.stringify(signup) });
      onAuth(result.user);
      onNavigate("/profile/setup");
    } catch (error) {
      onToast(`Couldn't create your account: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      await api("/health");
      window.location.assign("/api/auth/google?flow=signup");
    } catch (error) {
      onToast(`Couldn't reach the account service. Start the Flask API and try again. ${error.message}`);
      setGoogleLoading(false);
    }
  };

  const contactNotice = (event) => {
    event.preventDefault();
    onToast("Contact messaging isn't connected in this demo yet.");
  };

  return (
    <div className="public-landing" ref={landingRef}>
      <header ref={headerRef} className="public-header" data-theme="dark">
        <a className="public-brand" href="#home" aria-label="Talinturo home"><BrandLogo className="brand-logo-public" /><span>TALINTURO</span></a>
        <nav aria-label="Landing page navigation">
          <a className="public-nav-active" aria-current="location" href="#home">Home <span>•</span></a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <button type="button" className="public-header-instructor" onClick={() => onNavigate("/instructor/sign-in")}>Instructor sign in</button>
        </nav>
        <a className="landing-button landing-button-yellow" href="#join">Get Started <span aria-hidden="true">↗</span></a>
      </header>
      <section className="landing-hero" id="home">
        <div className="hero-cloud">
          <span className="hero-pill">A little play. A lot of connection.</span>
          <svg className="hero-sparkle hero-sparkle-one" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 0C27.5 15 33 20.5 48 24C33 27.5 27.5 33 24 48C20.5 33 15 27.5 0 24C15 20.5 20.5 15 24 0Z" /><circle cx="24" cy="24" r="3" /></svg>
          <svg className="hero-sparkle hero-sparkle-two" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 0C27.5 15 33 20.5 48 24C33 27.5 27.5 33 24 48C20.5 33 15 27.5 0 24C15 20.5 20.5 15 24 0Z" /><circle cx="24" cy="24" r="3" /></svg>
          <h1>Learn Filipino<br />Sign Language</h1>
          <p>Bridge communication barriers at home and in everyday life with playful lessons. 100% free for everyone.</p>
          <div className="hero-buttons">
            <a className="landing-button landing-button-coral" href="#join">Get Started <span aria-hidden="true">↗</span></a>
            <a className="landing-button landing-button-yellow" href="#contact">Contribute <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="hero-wave" aria-hidden="true" />
      </section>

      <section className="landing-join" id="join">
        <p className="landing-section-title">Your next connection starts here.</p>
        <div className="join-layout">
          <div className="join-mascot join-mascot-dog" aria-hidden="true">
            <span className="mascot-face">🐶</span>
            <strong>Small steps.<br />Shared understanding.</strong>
            <span className="mascot-caption">For every age, at every stage.</span>
          </div>
          <div className="join-card">
            <h2>Join us today!</h2>
            <p>A space to learn, play, and connect.</p>
            <form onSubmit={createAccount}>
              <label>Your name<input value={signup.name} onChange={(event) => setSignup({ ...signup, name: event.target.value })} autoComplete="name" required maxLength={70} placeholder="How should we call you?" /></label>
              <label>Email<input type="email" value={signup.email} onChange={(event) => setSignup({ ...signup, email: event.target.value })} autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
              <label>Password<input type="password" value={signup.password} onChange={(event) => setSignup({ ...signup, password: event.target.value })} autoComplete="new-password" minLength={8} maxLength={128} required placeholder="Create a password" /></label>
              <button className="landing-button landing-button-blue" type="submit" disabled={loading || googleLoading}>{loading ? "Creating account…" : "Create account"}</button>
            </form>
            <div className="join-or"><span>or sign up with</span></div>
            <button className="join-google-button" type="button" disabled={loading || googleLoading} onClick={startGoogleSignup}>{googleLoading ? "Connecting to Google…" : "◎ Sign up with Google"}</button>
            <p className="join-signin">Already learning with us? <button type="button" onClick={() => onNavigate("/login")}>Sign in</button></p>
            <p className="join-signin join-instructor-link">Teaching with Talinturo? <button type="button" onClick={() => onNavigate("/instructor/sign-in")}>Instructor sign in</button></p>
          </div>
          <div className="join-mascot join-mascot-bird" aria-hidden="true">
            <span className="free-bubble">100% free.<br />For everyone.</span>
            <span className="mascot-face">🐥</span>
          </div>
        </div>
        <span className="join-floating-avatar" aria-hidden="true">🙂</span>
        <div className="join-wave" aria-hidden="true" />
      </section>

      <section className="landing-about" id="about">
        <div className="landing-section-inner">
          <p className="landing-kicker">BUILT FOR SHARED UNDERSTANDING</p>
          <h2>About the Platform</h2>
          <p className="landing-about-intro">A playful approach to Filipino Sign Language, shaped around the way you learn — at home and in the classroom.</p>
          <div className="about-layout">
            <div className="learning-preview" aria-hidden="true">
              <div className="preview-bunny">🐰</div>
              <div className="preview-card">
                <small>Everyday connections <span>●</span></small>
                <div className="preview-tiles"><span>📖</span><span>☕</span></div>
                <div className="preview-progress"><i /><i /><i /><i /><i /></div>
                <p>Notice. Practice. Connect.</p>
              </div>
            </div>
            <div className="about-features">
              <article><h3>Learn through everyday moments</h3><p>Build familiarity with useful signs in friendly, real-life situations.</p><span>Explore and recognize</span></article>
              <article><h3>Practice at your own pace</h3><p>Use guided activities and revisit lessons whenever you need.</p><span>Practice with confidence</span></article>
              <article><h3>Make learning a shared experience</h3><p>Discover ways to learn together with family, friends, and educators.</p><span>Notice. Practice. Connect.</span></article>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-learners" id="learners">
        <div className="learners-heading">
          <div><p className="landing-kicker">DIFFERENT LEARNERS. ONE SHARED LANGUAGE.</p><h2>Tailored for Every Learner</h2></div>
          <p>A path that meets you where you are — at home, in class, or simply curious.</p>
        </div>
        <div className="learner-cards">
          {[
            ["Talinturo Kids", "Explore bite-sized lessons and friendly scenarios that make practice feel approachable.", "Explore playful learning"],
            ["FSL Students", "Practice useful vocabulary and everyday scenarios in a supportive space.", "Start learning"],
            ["Casual Learner", "Begin with beginner-friendly paths and short practice activities. Learn a little at a time.", "Find a learning path"],
            ["For FSL Instructors", "Create classrooms, manage learner rosters, and keep track of progress.", "Explore classroom tools"],
          ].map(([title, copy, link], index) => (
            <a className="learner-card" href="#join" key={title}>
              <span className={`learner-card-art learner-card-art-${index + 1}`} aria-hidden="true">{["🌱", "📚", "✨", "🌼"][index]}</span>
              <strong>{title}</strong><p>{copy}</p><span className="learner-card-link">{link}<b aria-hidden="true">↗</b></span>
            </a>
          ))}
        </div>
      </section>

      <section className="landing-team" id="team">
        <span className="hero-pill">The people behind the purpose</span>
        <h2>Meet the Team</h2>
        <p className="team-subtitle">Meet the people building TALINTURO.</p>
        <div className="team-layout">
          <div className="team-art" aria-hidden="true"><span>👋</span><span>💛</span><span>🤟</span></div>
          <div><h3>One team, one mission.</h3><p>We believe small moments of understanding can make a big difference. Talinturo is here to make Filipino Sign Language learning more welcoming, practical, and joyful for everyone.</p></div>
        </div>
      </section>

      <section className="landing-contact" id="contact">
        <div className="contact-layout">
          <div><p className="landing-contact-kicker">CONTACT</p><h2>Good things start with a conversation.</h2><p>Have a question, an idea, or a way to contribute? We'd love to hear from you.</p></div>
          <form className="contact-card" onSubmit={contactNotice}>
            <h3>Send us a message</h3>
            <div className="contact-fields">
              <label>Name<input required placeholder="Your name" /></label>
              <label>Email<input type="email" required placeholder="you@example.com" /></label>
            </div>
            <label>Message<textarea required rows="3" placeholder="What would you like to share?" /></label>
            <button className="landing-button landing-button-blue" type="submit">Send Message</button>
            <small>Contact messaging isn't connected in this demo yet.</small>
          </form>
        </div>
        <footer className="public-footer">
          <a className="public-brand" href="#home" aria-label="Talinturo home"><BrandLogo className="brand-logo-public" /><span>TALINTURO</span></a>
          <span>Filipino Sign Language. Free for everyone.</span>
          <small>© 2026 TALINTURO</small>
        </footer>
      </section>
    </div>
  );
}

function Dashboard({ user, onNavigate }) {
  const reduceMotion = useContext(PageMotionContext);
  const textVariants = introTextVariants(reduceMotion);
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api("/dashboard")
      .then(setSummary)
      .catch((error) => setLoadError(error.message));
  }, []);

  const firstName = user.name.split(" ")[0];

  return (
    <div className="learner-dashboard">
      <section className="learner-hero">
        <m.div
          className="learner-hero-copy"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.085, delayChildren: reduceMotion ? 0 : 0.04 } } }}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
        >
          <m.span className="dashboard-kicker" variants={textVariants}>YOUR LEARNING SPACE</m.span>
          <m.h1 variants={textVariants}>Hi, {firstName}!<br />Ready for a little progress?</m.h1>
          <m.p variants={textVariants}>Every sign is a new way to connect. Pick up where you left off, or explore something new.</m.p>
          <div className="learner-hero-actions">
            <Button className="dashboard-button-yellow" onClick={() => onNavigate(summary?.next_lesson ? `/paths/${summary.next_lesson.path_id}` : "/paths")}>Continue learning <span>→</span></Button>
            <button className="dashboard-text-button" onClick={() => onNavigate("/paths")}>Browse learning paths</button>
          </div>
        </m.div>
        <div className="learner-hero-art" aria-hidden="true">
          <div className="learner-art-orbit"><Icon name="hand" size={76} /></div>
          <span className="learner-art-spark learner-art-spark-one">✦</span>
          <span className="learner-art-spark learner-art-spark-two">✦</span>
          <span className="learner-art-caption">One sign at a time</span>
        </div>
      </section>

      {loadError && <p className="inline-error" role="alert">Could not load your learning summary: {loadError}</p>}

      <section className="dashboard-metrics" aria-label="Your learning at a glance">
        <StatCard icon="bookOpen" tone="blue" label="Lessons completed" value={summary ? summary.lessons_completed : "—"} change="Every step counts" />
        <StatCard icon="star" tone="yellow" label="Practice accuracy" value={summary?.average_score == null ? "—" : `${summary.average_score}%`} change="From completed activities" />
        <StatCard icon="flame" tone="coral" label="Learning streak" value={summary ? `${summary.learning_streak} days` : "—"} change="A little practice each day" />
      </section>

      <div className="learner-dashboard-grid">
        <section className="dashboard-card continue-card">
          <div className="dashboard-card-heading">
            <div><p className="dashboard-kicker">PICK UP WHERE YOU LEFT OFF</p><h2>Your next lesson</h2></div>
          </div>
          {summary?.next_lesson ? <>
            <div className="next-lesson">
              <div className="next-lesson-art"><Icon name="hand" size={39} /></div>
              <div className="next-lesson-copy">
                <span className="dashboard-kicker">{summary.next_lesson.path_title} · {summary.next_lesson.level}</span>
                <h3>{summary.next_lesson.title}</h3>
                <p>Continue building your skills, one lesson at a time.</p>
                <div className="next-lesson-progress"><ProgressBar value={summary.next_lesson.progress} color="blue" /><span>{summary.next_lesson.progress}%</span></div>
              </div>
            </div>
            <div className="next-lesson-footer"><span>{summary.next_lesson.duration_minutes ? `About ${summary.next_lesson.duration_minutes}` : "Continue at your own pace"}</span><Button onClick={() => onNavigate(`/paths/${summary.next_lesson.path_id}`)}>Continue <span>→</span></Button></div>
          </> : <div className="empty-state"><Icon name="bookOpen" size={30} /><h3>No lesson is ready yet</h3><p>Publish a lesson in the PostgreSQL <code>lessons</code> table and connect it to a published learning path.</p></div>}
        </section>

        <section className="dashboard-card quick-start-card">
          <div className="dashboard-card-heading"><div><p className="dashboard-kicker">MAKE A CONNECTION</p><h2>Quick ways to learn</h2></div><span className="quick-start-star">✦</span></div>
          <button className="quick-start-link" onClick={() => onNavigate("/vocabulary")}><span className="quick-start-icon quick-start-blue"><Icon name="book" size={21} /></span><span><strong>Explore vocabulary</strong><small>Learn useful everyday signs</small></span><b>→</b></button>
          <button className="quick-start-link" onClick={() => onNavigate("/scenarios")}><span className="quick-start-icon quick-start-coral"><Icon name="message" size={21} /></span><span><strong>Try a real-life story</strong><small>Practice in a friendly setting</small></span><b>→</b></button>
          <button className="quick-start-link" onClick={() => onNavigate("/challenge")}><span className="quick-start-icon quick-start-yellow"><Icon name="sparkles" size={21} /></span><span><strong>Take a level challenge</strong><small>See what you already know</small></span><b>→</b></button>
        </section>

        <section className="dashboard-card learner-path-card">
          <div className="dashboard-card-heading"><div><p className="dashboard-kicker">SMALL STEPS, BIG CONNECTIONS</p><h2>Your learning paths</h2></div><button className="dashboard-inline-link" onClick={() => onNavigate("/paths")}>See all <span>→</span></button></div>
          <div className="learner-paths">
            {summary?.featured_paths?.length ? summary.featured_paths.map((path, index) => (
              <button className={`learner-path-item ${index % 2 ? "path-item-coral" : "path-item-yellow"}`} key={path.id} onClick={() => onNavigate(`/paths/${path.id}`)}><span className="path-item-icon"><Icon name={index % 2 ? "home" : "hand"} size={24} /></span><span><strong>{path.title}</strong><small>{path.description || path.level}</small></span><Icon name="compass" size={19} /></button>
            )) : <div className="empty-state"><Icon name="bookOpen" size={30} /><h3>No learning paths yet</h3><p>Add a published path to PostgreSQL <code>learning_paths</code> to show it here.</p></div>}
          </div>
        </section>
      </div>
      <section className="learner-encouragement"><Icon name="heart" size={22} /><p><strong>Learning looks different for everyone.</strong> Go at your own pace. There's no wrong way to make progress.</p><button onClick={() => onNavigate("/progress")}>View my progress <span>→</span></button></section>
    </div>
  );
}

function StatCard({ icon, tone, label, value, change }) {
  return <div className="stat-card"><span className={`stat-icon ${tone}`}><Icon name={icon} size={21} /></span><div className="stat-copy"><small>{label}</small><strong>{value}</strong><span>{change}</span></div><span className="stat-menu">···</span></div>;
}

function PathPreview({ icon, color, title, lessons: count, progress }) {
  return <div className="path-preview"><div className={`path-preview-icon ${color}`}>{icon}</div><div className="path-preview-body"><div><strong>{title}</strong><small>{count}</small></div><ProgressBar value={progress} /><small>{progress ? `${progress}% complete` : "Ready when you are"}</small></div></div>;
}

function LearningPaths({ onNavigate }) {
  const [filter, setFilter] = useState("All paths");
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    api("/paths")
      .then((result) => setPaths(result.paths))
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);
  const visiblePaths = paths.filter((path) =>
    filter === "All paths"
    || (filter === "In progress" && path.progress > 0 && path.progress < 100)
    || (filter === "Not started" && path.progress === 0)
    || (filter === "Completed" && path.progress === 100),
  );
  return <>
    <PageTitle eyebrow="LEARN AT YOUR OWN PACE" title="Learning paths" description="A little practice each day goes a long way. Find the path that feels right for you." action={<Button onClick={() => onNavigate("/practice")}><Icon name="hand" size={17} /> Quick practice</Button>} />
    <div className="filter-row">{["All paths", "In progress", "Not started", "Completed"].map((item) => <button key={item} className={`filter-chip ${filter === item ? "filter-active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}</div>
    {loadError && <DatabaseHelpNotice error={loadError} />}
    {loading ? <div className="empty-state">Loading your learning paths…</div> : visiblePaths.length ? <div className="learning-path-grid">{visiblePaths.map((path, index) => {
      const color = ["peach", "lavender", "yellow"][index % 3];
      return <article className="path-card" key={path.id}><div className={`path-card-art ${color}`}><span className="path-emoji"><Icon name="bookOpen" size={42} /></span><span className="path-level">{path.level}</span><span className="path-sparkle">✦</span></div><div className="path-card-content"><span className="eyebrow">LEARNING PATH</span><h2>{path.title}</h2>{path.description && <p>{path.description}</p>}<div className="path-card-meta"><span>▤ {path.lessons} bite-sized lessons</span></div><div className="path-card-progress"><ProgressBar value={path.progress} /><span>{path.progress}% complete</span></div><Button variant={path.progress ? "primary" : "outline"} onClick={() => onNavigate(`/paths/${path.id}`)}>View lessons <span>→</span></Button></div></article>;
    })}</div> : <div className="empty-state"><Icon name="sprout" size={34} /><h2>{paths.length ? "No paths in this group yet" : "No published learning paths yet"}</h2><p>{paths.length ? "Choose another filter to see your paths." : <>Add a published record to PostgreSQL <code>learning_paths</code> and link published lessons to it.</>}</p></div>}
    <section className="encouragement-strip"><Icon name="sparkles" size={26} /><div><strong>Learning looks different for everyone.</strong><p>Go at your own pace. There's no wrong way to make progress.</p></div><button className="text-link" onClick={() => onNavigate("/help")}>Our approach →</button></section>
  </>;
}

function DatabaseHelpNotice({ error }) {
  return <section className="database-help-notice panel" role="alert">
    <span className="database-help-icon"><Icon name="lifeBuoy" size={23} /></span>
    <div>
      <p className="eyebrow">CAN'T REACH THE LEARNING WORLD?</p>
      <h2>Check your database connection</h2>
      <p>{error}</p>
      <p>Open <strong>SETUP.md → Connect PostgreSQL</strong>. Set <code>DATABASE_URL</code> (and <code>PGHOST</code>, <code>PGPORT</code>, <code>PGDATABASE</code>, <code>PGUSER</code>, and <code>PGPASSWORD</code> if needed) in the same PowerShell window that runs Flask, then restart the backend.</p>
      <p>If Flask reports missing lesson columns, apply the updated <code>talinturo_database.sql</code> to your database.</p>
    </div>
  </section>;
}

function LessonMedia({ lesson }) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const imageUrl = typeof lesson.image_url === "string" ? lesson.image_url.trim() : "";

  return <div className="lesson-media">
    {imageUrl && !imageUnavailable
      ? <img className="lesson-media-image" src={imageUrl} alt={`${lesson.title} lesson`} loading="lazy" onError={() => setImageUnavailable(true)} />
      : <div className="lesson-media-placeholder"><Icon name="bookOpen" size={32} /><span>{imageUrl ? "Lesson image unavailable" : "No image available"}</span></div>}
  </div>;
}

function LessonViewer({ onNavigate }) {
  const { pathId, lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subtitlesOn, setSubtitlesOn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLesson(null);
    setError("");
    setLoading(true);
    setSubtitlesOn(false);
    api(`/lessons/${lessonId}`)
      .then((result) => {
        if (!active) return;
        setLesson(result.lesson);
        setCompleted(result.lesson.progress >= 100);
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lessonId]);

  const toggleSubtitles = () => {
    const tracks = videoRef.current?.textTracks;
    if (!tracks?.length) return;
    const enabled = !subtitlesOn;
    for (let index = 0; index < tracks.length; index += 1) tracks[index].mode = enabled ? "showing" : "disabled";
    setSubtitlesOn(enabled);
  };

  const finishLesson = async () => {
    setSaving(true);
    setError("");
    try {
      await api(`/lessons/${lessonId}/complete`, { method: "POST" });
      setCompleted(true);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="empty-state">Loading lesson...</div>;
  if (error && !lesson) return <><PageTitle eyebrow="LEARNING PATH" title="Lesson unavailable" /><p className="inline-error">{error}</p><Button variant="outline" onClick={() => onNavigate(`/paths/${pathId}`)}>Back to learning path</Button></>;
  if (!lesson) return null;
  const transcript = lesson.content?.transcript;
  const captionsUrl = lesson.content?.captions_url;
  const sections = Array.isArray(lesson.content?.sections) ? lesson.content.sections : [];
  const hasMaterial = Boolean(lesson.video_url || sections.length);

  return <div className="lesson-viewer">
    <PageTitle eyebrow={`${lesson.path_title} · ${lesson.duration_minutes || "0:00"}`} title={lesson.title} description={lesson.description} action={<Button variant="outline" onClick={() => onNavigate(`/paths/${pathId}`)}>Back to path</Button>} />
    {error && <p className="inline-error" role="alert">{error}</p>}
    <section className="lesson-player-card panel" aria-label="Lesson video">
      {lesson.video_url
        ? <video ref={videoRef} className="lesson-player" controls playsInline preload="metadata" poster={lesson.image_url || undefined}>
          <source src={lesson.video_url} />
          {captionsUrl && <track kind="captions" src={captionsUrl} srcLang="en" label="English subtitles" default={false} />}
          Your browser does not support embedded video.
        </video>
        : <div className="lesson-player-empty"><Icon name="camera" size={32} /><span>Video is not available for this lesson yet.</span></div>}
      <div className="lesson-player-controls">
        <span><Icon name="bookOpen" size={16} /> Lesson video</span>
        <button type="button" className="button button-outline" onClick={toggleSubtitles} disabled={!captionsUrl || !lesson.video_url} aria-pressed={subtitlesOn}>
          {subtitlesOn ? "Subtitles on" : "Subtitles"}
        </button>
      </div>
      {!captionsUrl && <p className="lesson-caption-note">Subtitles are not available for this lesson yet.</p>}
    </section>

    <section className="lesson-transcript panel">
      <div className="lesson-transcript-heading"><span className="eyebrow">LESSON NOTES</span><h2>Transcript</h2></div>
      {typeof transcript === "string" && transcript.trim()
        ? <p className="lesson-transcript-copy">{transcript}</p>
        : <p className="lesson-caption-note">Transcript is not available for this lesson yet.</p>}
      {sections.map((section, index) => <article className="lesson-transcript-section" key={section.id || index}><h3>{section.title}</h3><p>{section.body}</p></article>)}
    </section>
    <div className="lesson-viewer-actions">
      {completed
        ? <Button onClick={() => onNavigate(`/paths/${pathId}`)}>Lesson complete · Back to path</Button>
        : <Button disabled={saving || !hasMaterial} onClick={finishLesson}>{saving ? "Saving..." : "Finish lesson"}</Button>}
    </div>
  </div>;
}

function LearningPathDetails({ onNavigate, reducedMotion }) {
  const { pathId } = useParams();
  const prefersReducedMotion = useReducedMotion() || reducedMotion;
  const [path, setPath] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setPath(null);
    setLessons([]);
    setLoadError("");
    setLoading(true);
    api(`/paths/${pathId}`)
      .then((result) => {
        if (!active) return;
        setPath(result.path);
        setLessons(result.lessons);
      })
      .catch((error) => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pathId]);
  if (loadError) return <><PageTitle eyebrow="LEARNING PATH" title="Path unavailable" /><DatabaseHelpNotice error={loadError} /><Button variant="outline" onClick={() => onNavigate("/paths")}>← All learning paths</Button></>;
  if (loading || !path) return <div className="empty-state">Loading learning path…</div>;
  const completedLessons = lessons.filter((lesson) => lesson.progress >= 100).length;
  const overallProgress = lessons.length ? Math.round(completedLessons * 100 / lessons.length) : 0;
  const currentLesson = lessons.find((lesson, index) =>
    lesson.progress < 100 && lessons.slice(0, index).every((previous) => previous.progress >= 100),
  );
  return <>
    <PageTitle eyebrow={path.level} title={path.title} description={path.description} action={<Button variant="outline" onClick={() => onNavigate("/paths")}>← All paths</Button>} />
    {saveError && <p className="inline-error">{saveError}</p>}
    <section className="path-map-summary panel">
      <div className="path-map-summary-top"><span className="path-map-section">YOUR LEARNING JOURNEY</span><span className="path-map-level">{path.level || "FSL PATH"}</span></div>
      <div className="path-map-summary-main"><div><h2>{currentLesson ? "Keep your momentum!" : "Journey complete!"}</h2><p>{currentLesson ? `Next up: ${currentLesson.title}` : "You completed every lesson in this path."}</p></div><strong>{overallProgress}%</strong></div>
      <ProgressBar value={overallProgress} />
      <div className="path-map-summary-bottom"><span><Icon name="star" size={16} /> {completedLessons} of {lessons.length} lessons complete</span><span>{lessons.length} lesson{lessons.length === 1 ? "" : "s"}</span></div>
    </section>
    {lessons.length ? <m.div
      className="lesson-journey"
      aria-label="Lessons in this learning path"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 } } }}
    >
      {lessons.map((lesson, index) => {
        const sections = Array.isArray(lesson.content?.sections) ? lesson.content.sections : [];
        const hasSections = sections.length > 0;
        const hasMaterial = hasSections || Boolean(lesson.video_url);
        const completed = lesson.progress >= 100;
        const current = !completed && lessons.slice(0, index).every((previous) => previous.progress >= 100);
        const locked = !completed && !current;
        const status = completed ? "completed" : current ? "current" : "locked";
        const nodeAnimation = current
          ? {
            scale: [1, 1.08, 1],
            boxShadow: [
              "0 0 0 0 rgba(248, 201, 47, .28)",
              "0 0 0 12px rgba(248, 201, 47, 0)",
              "0 0 0 0 rgba(248, 201, 47, .28)",
            ],
          }
          : completed
            ? {
              boxShadow: [
                "0 0 16px rgba(248, 201, 47, .44)",
                "0 0 26px rgba(248, 201, 47, .78)",
                "0 0 16px rgba(248, 201, 47, .44)",
              ],
            }
            : undefined;
        return <m.article
          className={`lesson-stop lesson-stop-${index % 2 ? "right" : "left"} lesson-stop-${status}`}
          key={lesson.id}
          aria-label={`Lesson ${index + 1}: ${lesson.title}, ${status}`}
          variants={{
            hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 18 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.32, ease: "easeOut" }}
        >
          <div className="lesson-node-column">
            <m.div
              className="lesson-node"
              animate={prefersReducedMotion ? undefined : nodeAnimation}
              transition={{ duration: current ? 1.8 : 2.6, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            >
              <Icon name={completed ? "star" : locked ? "lock" : "bookOpen"} size={27} />
            </m.div>
            <span className="lesson-node-number">{String(index + 1).padStart(2, "0")}</span>
          </div>
          <div className="lesson-stop-card">
            <div className="lesson-stop-heading">
              <span className={`lesson-status-label lesson-status-${status}`}>
                {completed ? "Completed" : current ? "Current lesson" : "Locked"}
              </span>
              <span className="lesson-duration">{lesson.duration_minutes || "Lesson"}</span>
            </div>
            <h2>{lesson.title}</h2>
            {lesson.content?.description && <p>{lesson.content.description}</p>}
            <LessonMedia lesson={lesson} />
            <div className="path-card-progress"><ProgressBar value={lesson.progress} /><span>{lesson.progress}% complete</span></div>
            {locked && <p className="lesson-lock-note"><Icon name="lock" size={15} /> Complete the previous lesson to unlock this one.</p>}
            <Button
              variant={locked ? "outline" : "primary"}
              disabled={locked || !hasMaterial}
              onClick={() => onNavigate(`/paths/${pathId}/lessons/${lesson.id}`)}
            >
              {locked ? "Locked" : hasMaterial ? "Continue" : "Lesson content needed"}
            </Button>
          </div>
        </m.article>;
      })}
    </m.div> : <div className="empty-state"><Icon name="bookOpen" size={34} /><h2>No lessons in this path yet</h2><p>Add published lessons linked to this learning path in PostgreSQL <code>lessons</code>.</p></div>}
  </>;
}

function Vocabulary() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All signs");
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    api("/vocabulary")
      .then((result) => setWords(result.words))
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);
  const toggleSaved = async (item) => {
    setSaveError("");
    try {
      const { is_saved } = await api(`/vocabulary/${item.id}/favorite`, { method: item.is_saved ? "DELETE" : "PUT" });
      setWords((current) => current.map((word) => word.id === item.id ? { ...word, is_saved } : word));
    } catch (error) {
      setSaveError(error.message);
    }
  };
  const categories = ["All signs", ...new Set(words.map((item) => item.category))];
  const filtered = words.filter((item) => (category === "All signs" || item.category === category) && `${item.word} ${item.meaning}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageTitle eyebrow="A LITTLE WORD, A BIG CONNECTION" title="FSL vocabulary" description="Discover useful Filipino Sign Language signs and add your favorites to practice later." />
    {(loadError || saveError) && <p className="inline-error">{loadError || saveError}</p>}
    <div className="vocab-controls"><label className="search-field"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search signs..." /><kbd>⌘ K</kbd></label><div className="filter-row">{categories.map((item) => <button key={item} className={`filter-chip ${category === item ? "filter-active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
    {loading ? <div className="empty-state">Loading vocabulary…</div> : filtered.length ? <div className="vocab-grid">{filtered.map((item) => <article className="vocab-card" key={item.id}><button className={`save-sign ${item.is_saved ? "saved" : ""}`} aria-label={`${item.is_saved ? "Unsave" : "Save"} ${item.word}`} onClick={() => toggleSaved(item)}>{item.is_saved ? "♥" : "♡"}</button>{item.media_url ? <img className="vocab-emoji" src={item.media_url} alt={item.word} /> : <div className="vocab-emoji"><Icon name="hand" size={38} /></div>}<span className="category-tag">{item.category}</span><h2>{item.word}</h2><p>{item.meaning}</p>{item.hint && <small>{item.hint}</small>}<button className="vocab-practice" onClick={() => window.speechSynthesis?.speak(new SpeechSynthesisUtterance(item.word))}><Icon name="volume" size={16} /> Hear the word</button></article>)}</div> : <div className="empty-state"><Icon name="search" size={34} /><h2>{words.length ? "No signs found" : "No published vocabulary yet"}</h2><p>{words.length ? "Try a different search or category." : <>Add published signs to PostgreSQL <code>vocabulary_signs</code> with a word, meaning, and category.</>}</p></div>}
  </>;
}

function Practice({ onToast }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [activities, setActivities] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [checked, setChecked] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadingActivities, setLoadingActivities] = useState(true);
  useEffect(() => {
    api("/practice")
      .then(({ activities: items }) => {
        setActivities(items);
        setSelectedId(items.length ? String(items[0].id) : "");
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoadingActivities(false));
  }, []);
  const selectedActivity = activities.find((activity) => String(activity.id) === selectedId);
  const content = selectedActivity?.content || {};
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  const toggleCamera = async () => {
    if (cameraOn) return stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) return onToast("Camera access isn't available in this browser. You can still practice with the sign guide.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (error) {
      onToast(error.name === "NotAllowedError" ? "Camera permission was declined. You can still practice with the sign guide." : `Could not start camera: ${error.message}`);
    }
  };
  const markPractice = async () => {
    if (!selectedActivity) return;
    try {
      await api("/progress/complete", {
        method: "POST",
        body: JSON.stringify({ activity_id: selectedActivity.id, response: { completed: true } }),
      });
      setChecked(true);
      onToast("Nice work! Your practice has been noted.");
    } catch (error) {
      onToast(`Your practice couldn't be saved: ${error.message}`);
    }
  };
  return <>
    <PageTitle eyebrow="PRACTICE MAKES CONNECTION" title="Sign practice" description="Take a breath, get comfortable, and practice a sign at your own pace." />
    {loadError && <p className="inline-error">{loadError}</p>}
    {loadingActivities ? <div className="empty-state">Loading practice activities…</div> : !loadError && !activities.length ? <div className="empty-state"><Icon name="hand" size={34} /><h2>No practice activities available</h2><p>Add a published <code>practice</code> activity to PostgreSQL <code>activities</code>, including its sign, meaning, steps, and any media URL in JSONB <code>content</code>.</p></div> : activities.length > 0 && <><div className="practice-layout"><section className="camera-panel"><div className="camera-top"><div><p className="eyebrow">YOUR PRACTICE SPACE</p><h2>Ready when you are</h2></div><span className={`camera-state ${cameraOn ? "camera-live" : ""}`}><i />{cameraOn ? "Camera on" : "Camera off"}</span></div><div className={`camera-view ${cameraOn ? "camera-active" : ""}`}>{cameraOn ? <video ref={videoRef} autoPlay muted playsInline /> : <><div className="camera-frame"><span /><span /><span /><span /></div><div className="camera-placeholder"><div className="camera-icon"><Icon name="camera" size={28} /></div><strong>Make yourself comfy</strong><p>Your camera preview will appear here.<br />Nothing is recorded or saved.</p><Button variant="outline" onClick={toggleCamera}>Turn on camera</Button></div></>}</div><div className="camera-controls"><Button variant={cameraOn ? "outline" : "primary"} onClick={toggleCamera}>{cameraOn ? "Turn camera off" : "Enable camera"} <span>⌕</span></Button><span><Icon name="shield" size={15} /> Your video stays on your device</span></div></section><aside className="sign-guide panel"><p className="eyebrow">{content.category || "PRACTICE ACTIVITY"}</p><label className="select-label">Choose an activity<select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setChecked(false); }} aria-label="Choose practice activity">{activities.map((activity) => <option value={activity.id} key={activity.id}>{activity.title}</option>)}</select></label><h2>{content.word || selectedActivity.title}</h2>{content.meaning && <p className="guide-meaning">{content.meaning}</p>}{content.media_url && <img className="practice-media" src={content.media_url} alt={content.media_alt || content.word || selectedActivity.title} />}<h3>{content.instructions_title || "Instructions"}</h3>{Array.isArray(content.steps) && content.steps.length ? <ol>{content.steps.map((step, index) => <li key={`${index}-${step}`}><span>{index + 1}</span> {step}</li>)}</ol> : <p>Add a <code>steps</code> array to this activity's PostgreSQL JSONB content.</p>}{content.hint && <div className="guide-note"><Icon name="lightbulb" size={18} /><p>{content.hint}</p></div>}</aside></div><section className="practice-check"><div><span className="check-star">✦</span><div><strong>Practice completed?</strong><small>Your practice record will be saved to your account.</small></div></div><div><Button variant={checked ? "outline" : "primary"} disabled={checked} onClick={markPractice}>{checked ? "✓ Practice noted" : "I practiced this activity"}</Button></div></section></>}
  </>;
}

function Scenarios({ onNavigate }) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    api("/scenarios")
      .then((result) => setScenarios(result.scenarios))
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);
  return <>
    <PageTitle eyebrow="LEARN BY LIVING IT" title="Choose a scenario" description="Practice useful signs in everyday moments. Pick a story and see where the conversation takes you." />
    {loadError && <p className="inline-error">Could not load scenarios: {loadError}</p>}
    <div className="scenario-banner"><Icon name="message" size={25} /><div><strong>Real moments, real connection</strong><p>Each scenario is a safe space to try, make mistakes, and grow your confidence.</p></div><span className="scenario-count">{scenarios.length} stories <b>·</b> 5–10 min each</span></div>
    {loading ? <div className="empty-state">Loading scenarios…</div> : scenarios.length ? <div className="scenario-grid">{scenarios.map((scenario, index) => {
      const colors = ["peach", "lavender", "mint"];
      const tag = scenario.category || "Scenario";
      return <article className="scenario-card" key={scenario.id}><div className={`scenario-art ${scenario.color || colors[index % colors.length]}`}><span>{scenario.emoji || <Icon name="message" size={38} />}</span><small>{tag}</small></div><div className="scenario-content"><span className="eyebrow">{tag.toUpperCase()} SCENARIO</span><h2>{scenario.title}</h2><p>{scenario.description}</p><div className="scenario-bottom"><span>{scenario.duration_minutes ? `⏱ ${scenario.duration_minutes} min` : tag}</span><Button variant="outline" onClick={() => onNavigate(`/activity/${scenario.id}`)}>Start story <span>→</span></Button></div></div></article>;
    })}</div> : <div className="empty-state"><Icon name="message" size={34} /><h2>No scenarios available yet</h2><p>Add a published scenario activity to PostgreSQL <code>activities</code>, with prompts and choices in its JSONB <code>content</code>.</p></div>}
    <div className="gentle-note"><Icon name="sprout" size={23} /><span>There's no pressure to get it perfect. This is your space to explore.</span></div>
  </>;
}

function ScenarioActivity({ onNavigate }) {
  const { activityId } = useParams();
  const [activity, setActivity] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    setActivity(null);
    setAnswers([]);
    setResult(null);
    setLoadError("");
    api(`/activities/${activityId}`)
      .then(({ activity: item }) => setActivity(item))
      .catch((error) => setLoadError(error.message));
  }, [activityId]);
  const content = activity?.content || {};
  const questions = Array.isArray(content.questions) ? content.questions : [];
  const questionsReady = questions.length > 0 && questions.every((question) =>
    typeof question?.prompt === "string" && Array.isArray(question.choices)
    && question.choices.length > 0 && question.choices.every((choice) => typeof choice?.label === "string"),
  );
  const submit = async () => {
    if (result) return onNavigate(`/results?activity_id=${activityId}`);
    try {
      const saved = await api("/progress/complete", {
        method: "POST",
        body: JSON.stringify({ activity_id: Number(activityId), response: { answers } }),
      });
      setResult(saved);
    } catch (error) {
      setLoadError(error.message);
    }
  };
  if (loadError) return <><PageTitle eyebrow="SCENARIO" title="Activity unavailable" /><p className="inline-error">{loadError}</p><Button variant="outline" onClick={() => onNavigate("/scenarios")}>← All scenarios</Button></>;
  if (!activity) return <div className="empty-state">Loading scenario…</div>;
  if (!questionsReady) return <div className="empty-state"><h2>This scenario needs question data</h2><p>Add a <code>questions</code> array with a prompt and labeled choices for each question in the activity's PostgreSQL JSONB <code>content</code>.</p></div>;
  return <><div className="activity-top"><button className="back-link" onClick={() => onNavigate("/scenarios")}>← All scenarios</button><span>{activity.title}</span><span>{questions.length} question{questions.length === 1 ? "" : "s"}</span></div><div className="activity-progress"><ProgressBar value={result ? 100 : 0} /></div><section className="activity-card panel"><div className="activity-art peach"><Icon name="message" size={40} /></div><span className="eyebrow">{content.category || activity.activity_type}</span><h1>{activity.title}</h1>{content.description && <p className="activity-prompt">{content.description}</p>}{questions.map((question, questionIndex) => <div className="activity-question" key={question.id || questionIndex}><h2>{question.prompt}</h2><div className="choice-grid">{(question.choices || []).map((choice, choiceIndex) => { const choiceId = choice.id ?? choice.label; return <button className={`choice-card ${answers[questionIndex] === choiceId ? "choice-selected" : ""}`} key={choiceId ?? choiceIndex} disabled={Boolean(result)} onClick={() => setAnswers((current) => { const next = [...current]; next[questionIndex] = choiceId; return next; })}><span className="choice-emoji">{choice.emoji || <Icon name="hand" size={23} />}</span><span><strong>{choice.label}</strong>{choice.meaning && <small>{choice.meaning}</small>}</span><span className="choice-radio">{answers[questionIndex] === choiceId ? "●" : "○"}</span></button>; })}</div>{question.hint && <small>{question.hint}</small>}</div>)}{result && <div className="answer-feedback"><Icon name="star" size={21} /><div><strong>Progress saved</strong><p>Your score: {result.score}%</p></div></div>}<div className="activity-actions"><span>{content.hint || ""}</span><Button disabled={!result && (answers.length !== questions.length || answers.some((answer) => answer === undefined))} onClick={submit}>{result ? "View results" : "Submit answers"} <span>→</span></Button></div></section></>;
}

function ActivityResults({ onNavigate }) {
  const [event, setEvent] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const { search } = useLocation();
  useEffect(() => {
    setEvent(null);
    setLoadError("");
    setLoading(true);
    const activityId = Number(new URLSearchParams(search).get("activity_id"));
    api("/progress")
      .then(({ events }) => setEvent(events.find((item) => item.activity_id === activityId) || events[0] || null))
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, [search]);
  if (loadError) return <p className="inline-error">{loadError}</p>;
  if (loading) return <div className="empty-state">Loading your result…</div>;
  if (!event) return <div className="empty-state"><h2>No completed activity found</h2><p>Finish a published scenario or practice activity to see its saved result here.</p><Button variant="outline" onClick={() => onNavigate("/scenarios")}>Choose a scenario</Button></div>;
  return <section className="result-card panel"><div className="result-confetti"><Icon name="sparkles" size={22} /></div><span className="result-icon"><Icon name="star" size={34} /></span><p className="eyebrow">ACTIVITY COMPLETE</p><h1>{event.activity}</h1><p>Your result has been saved to your learning history.</p><div className="result-stats"><div><strong>{event.score}%</strong><small>score</small></div><div><strong>{new Date(event.created_at).toLocaleDateString()}</strong><small>completed</small></div></div><div className="result-actions"><Button onClick={() => onNavigate("/scenarios")}>Choose another story <span>→</span></Button><button className="text-link" onClick={() => onNavigate("/progress")}>See my progress</button></div></section>;
}

function Challenge({ onNavigate, onToast }) {
  const [challenges, setChallenges] = useState([]);
  const [challengeId, setChallengeId] = useState("");
  const [answers, setAnswers] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api("/challenges")
      .then(({ challenges: items }) => {
        setChallenges(items);
        setChallengeId(items.length ? String(items[0].id) : "");
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);
  const challenge = challenges.find((item) => String(item.id) === challengeId);
  const questions = Array.isArray(challenge?.content?.questions) ? challenge.content.questions : [];
  const questionsReady = questions.length > 0 && questions.every((question) =>
    typeof question?.prompt === "string" && Array.isArray(question.choices)
    && question.choices.length > 0 && question.choices.every((choice) => typeof choice?.label === "string"),
  );
  const submit = async () => {
    if (!challenge || answers.length !== questions.length || answers.some((answer) => answer === undefined)) {
      return onToast("Answer every question before submitting.");
    }
    try {
      const result = await api("/progress/complete", {
        method: "POST",
        body: JSON.stringify({ activity_id: challenge.id, response: { answers } }),
      });
      onNavigate(result.score === 100 ? "/challenge/success" : "/challenge/try-again");
    } catch (error) {
      setLoadError(error.message);
    }
  };
  if (loadError) return <><PageTitle eyebrow="YOUR LEARNING JOURNEY" title="Level challenge" /><p className="inline-error">{loadError}</p></>;
  if (loading) return <div className="empty-state">Loading challenges…</div>;
  if (!challenges.length) return <><PageTitle eyebrow="YOUR LEARNING JOURNEY" title="Level challenge" description="Challenge questions will appear here when they are published." /><div className="empty-state"><Icon name="sparkles" size={34} /><h2>No challenge available</h2><p>Add a published challenge activity to PostgreSQL <code>activities</code> with questions, choices, and correct-choice flags.</p></div></>;
  if (!challenge || !questionsReady) return <div className="empty-state"><h2>This challenge needs question data</h2><p>Add a <code>questions</code> array with prompts and labeled choices to the activity's JSONB <code>content</code>.</p></div>;
  return <><PageTitle eyebrow="A NEW CHAPTER IS WAITING" title={challenge.title} description={challenge.content.description} /><section className="challenge-panel panel"><div className="challenge-top"><span className="challenge-badge">✦</span><label>Choose challenge <select value={challengeId} onChange={(event) => { setChallengeId(event.target.value); setAnswers([]); }} aria-label="Choose challenge">{challenges.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><span>{questions.length} question{questions.length === 1 ? "" : "s"}</span></div><ProgressBar value={answers.filter((answer) => answer !== undefined).length / questions.length * 100} color="peach" /><div className="challenge-question">{questions.map((question, questionIndex) => <div key={question.id || questionIndex}><p className="eyebrow">{question.instruction || "CHALLENGE"}</p><h2>{question.prompt}</h2><div className="challenge-options">{(question.choices || []).map((choice, choiceIndex) => { const choiceId = choice.id ?? choice.label; return <button className={`challenge-option ${answers[questionIndex] === choiceId ? "challenge-selected" : ""}`} key={choiceId ?? choiceIndex} onClick={() => setAnswers((current) => { const next = [...current]; next[questionIndex] = choiceId; return next; })}>{choice.label}<span>{answers[questionIndex] === choiceId ? "●" : "○"}</span></button>; })}</div></div>)}<Button onClick={submit}>Submit challenge <span>→</span></Button></div><p className="challenge-footnote">Take a breath. Learning isn't a race. <button onClick={() => onNavigate("/")}>Come back later</button></p></section></>;
}

function ChallengeFeedback({ success = false, onNavigate }) {
  return <section className={`feedback-card panel ${success ? "feedback-success" : "feedback-retry"}`}><span className="feedback-icon"><Icon name={success ? "star" : "sprout"} size={34} /></span><p className="eyebrow">{success ? "CHALLENGE COMPLETE" : "EVERY TRY IS PROGRESS"}</p><h1>{success ? "Well done!" : "Keep practicing."}</h1><p>{success ? "Your challenge result has been saved. Continue exploring the published learning content." : "Review the signs and try the published challenge again when you're ready."}</p><div className="result-actions"><Button onClick={() => onNavigate(success ? "/paths" : "/challenge")}>{success ? "Explore learning paths" : "Try the challenge again"} <span>→</span></Button><button className="text-link" onClick={() => onNavigate("/")}>Back to my dashboard</button></div></section>;
}

function Progress() {
  const [dashboard, setDashboard] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    Promise.all([api("/dashboard"), api("/progress")])
      .then(([dashboardData, progressData]) => { setDashboard(dashboardData); setProgress(progressData); })
      .catch((error) => setLoadError(error.message));
  }, []);
  const weeklyActivity = progress?.weekly_activity || [];
  const maxDailyActivity = Math.max(1, ...weeklyActivity.map((day) => day.completed));
  const earnedAchievements = (progress?.achievements || []).filter((achievement) => achievement.earned).length;
  return <>
    <PageTitle eyebrow="LOOK HOW FAR YOU'VE COME" title="My progress" description="Every practice session counts. Here's a little snapshot of your learning journey." action={<Button variant="outline" onClick={() => window.print()}>↓ Save my progress</Button>} />
    {loadError && <p className="inline-error">Could not refresh your progress: {loadError}</p>}
    <div className="progress-overview">
      <StatCard icon="bookOpen" tone="lavender" label="Lessons done" value={dashboard ? dashboard.lessons_completed : "—"} change="Completed activities of type lesson" />
      <StatCard icon="flame" tone="yellow" label="Current streak" value={progress ? `${progress.current_streak} days` : "—"} change="Consecutive days with a completed activity" />
      <StatCard icon="star" tone="peach" label="Completed activities" value={progress ? progress.activity_count : "—"} change="Saved to your profile" />
      <StatCard icon="heart" tone="mint" label="Badges earned" value={progress ? earnedAchievements : "—"} change="From published achievements" />
    </div>
    <div className="progress-content-grid">
      <section className="panel progress-chart-panel">
        <div className="panel-heading"><div><p className="eyebrow">SHOWING UP IS EVERYTHING</p><h2>Your learning rhythm</h2></div><span className="soft-tag">Last 7 days</span></div>
        {weeklyActivity.length ? <div className="large-chart">{weeklyActivity.map((day) => <div key={day.activity_date}><span className="large-chart-bar" style={{height: `${Math.max(3, (day.completed / maxDailyActivity) * 100)}%`}}/><small>{new Date(`${day.activity_date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</small></div>)}</div> : <div className="empty-state"><p>Completed activity will appear here once progress has been saved.</p></div>}
        <p className="chart-caption">Daily totals are calculated from your completed PostgreSQL activity records.</p>
      </section>
      <section className="panel level-panel"><p className="eyebrow">RECENT ACTIVITY</p><h2>Your completed work</h2>{progress?.events?.length ? <div className="timeline">{progress.events.slice(0, 6).map((event, index) => <div key={`${event.activity}-${event.created_at}-${index}`}><i className={`timeline-dot ${["mint", "peach", "lavender"][index % 3]}`} /><span><strong>{event.activity} · {event.score}%</strong><small>{new Date(event.created_at).toLocaleString()}</small></span></div>)}</div> : <p>No completed activities yet. Publish and complete a practice or scenario activity to begin tracking progress.</p>}</section>
    </div>
    <section className="panel achievement-list">
      <div className="panel-heading"><div><p className="eyebrow">MILESTONES TO CELEBRATE</p><h2>Your badges</h2></div><span className="soft-tag">{earnedAchievements} earned</span></div>
      {progress?.achievements?.length ? <div className="badge-list">{progress.achievements.map((achievement) => <div className={achievement.earned ? "" : "badge-locked"} key={achievement.id}><Icon name={achievement.earned ? "star" : "lock"} size={22} /><strong>{achievement.name}</strong><small>{achievement.description}</small></div>)}</div> : <div className="empty-state"><p>No published achievements yet. Add definitions to the PostgreSQL <code>achievements</code> table.</p></div>}
    </section>
  </>;
}

function InstructorDashboard({ user, onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [roster, setRoster] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [rosterLoaded, setRosterLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api("/dashboard"),
      api("/instructor/learners"),
      api("/instructor/classrooms"),
    ])
      .then(([dashboardData, learnersData, classroomsData]) => {
        setSummary(dashboardData);
        setRoster(learnersData.learners.map((learner, index) => ({
          ...learner,
          initials: learner.name.split(" ").map((part) => part[0]).slice(0, 2).join(""),
          color: ["coral", "blue", "purple", "gold"][index % 4],
        })));
        setClassrooms(classroomsData.classrooms);
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setRosterLoaded(true));
  }, []);

  const firstName = user.name.split(" ")[0];

  return <>
    <div className="instructor-dashboard">
      <section className="instructor-hero">
        <div><span className="dashboard-kicker">YOUR CLASSROOM, AT A GLANCE</span><h1>Welcome back, {firstName}.</h1><p>Small moments of encouragement can make a big difference. Here's what's happening in your learning community.</p></div>
        <Button className="dashboard-button-yellow" onClick={() => onNavigate("/classrooms/create")}>＋ Create a classroom</Button>
      </section>
      {loadError && <p className="inline-error" role="alert">Could not load your classroom overview: {loadError}</p>}
      <div className="dashboard-metrics instructor-metrics">
        <StatCard icon="users" tone="blue" label="Learners" value={summary ? roster.length : "—"} change="In your learning community" />
        <StatCard icon="school" tone="yellow" label="Classrooms" value={summary ? summary.classrooms : "—"} change="Spaces to learn together" />
        <StatCard icon="bookOpen" tone="coral" label="Lessons completed" value={summary ? summary.lessons_completed : "—"} change="Across your account" />
        <StatCard icon="heart" tone="mint" label="Learners to encourage" value={summary ? roster.filter((learner) => learner.accuracy < 85).length : "—"} change="A kind check-in can help" />
      </div>
      <div className="instructor-dashboard-grid">
        <section className="dashboard-card instructor-roster-card">
          <div className="dashboard-card-heading"><div><p className="dashboard-kicker">YOUR PEOPLE</p><h2>Learner snapshots</h2></div><button className="dashboard-inline-link" onClick={() => onNavigate("/learners")}>All learners <span>→</span></button></div>
          {roster.length > 0
            ? <LearnerTable rows={roster.slice(0, 4)} onNavigate={onNavigate} />
            : !rosterLoaded && !loadError ? <p className="dashboard-loading">Loading your learner roster…</p> : !loadError && <p className="empty-table">No active learners are connected to your classrooms yet.</p>}
        </section>
        <section className="dashboard-card instructor-classrooms-card">
          <div className="dashboard-card-heading"><div><p className="dashboard-kicker">LEARN TOGETHER</p><h2>Your classrooms</h2></div><span className="classroom-card-mark"><Icon name="school" size={22} /></span></div>
          {classrooms.length ? classrooms.slice(0, 3).map((classroom) => (
            <div className="dashboard-classroom" key={classroom.id}><span className="classroom-mark"><Icon name="home" size={19} /></span><span><strong>{classroom.name}</strong><small>{classroom.student_count} learners · {classroom.code}</small></span><Icon name="compass" size={18} /></div>
          )) : !loadError && <p className="dashboard-loading">Loading your classrooms…</p>}
          {classrooms.length === 0 && !loadError && summary?.classrooms === 0 && <p className="classroom-empty">Your first classroom is just a little step away.</p>}
          <Button variant="outline" className="full-button" onClick={() => onNavigate("/classrooms")}>Manage classrooms <span>→</span></Button>
        </section>
        <section className="dashboard-card instructor-next-step">
          <span className="instructor-next-icon"><Icon name="lightbulb" size={26} /></span>
          <p className="dashboard-kicker">A GENTLE REMINDER</p>
          <h2>Celebrate the effort, not just the answer.</h2>
          <p>Every attempt is a brave step toward better communication. Your encouragement matters.</p>
          <button className="dashboard-inline-link" onClick={() => onNavigate("/help")}>More teaching tips <span>→</span></button>
        </section>
      </div>
    </div>
  </>;
}

function LearnerTable({ rows, onNavigate }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>LEARNER</th><th>LEVEL</th><th>ACTIVITIES</th><th>ACCURACY</th><th>LAST ACTIVE</th><th /></tr></thead><tbody>{rows.map((learner) => <tr key={learner.id}><td><button className="learner-name" onClick={() => onNavigate(`/learners/${learner.id}`)}><span className={`avatar avatar-${learner.color || "mint"}`}>{learner.initials || learner.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{learner.name}</strong></span></button></td><td><span className="soft-tag">{learner.level}</span></td><td>{learner.activities ?? "—"}</td><td><div className="table-progress">{learner.accuracy == null ? "—" : `${learner.accuracy}%`}{learner.accuracy != null && <ProgressBar value={learner.accuracy} />}</div></td><td>{learner.last_active ? new Date(learner.last_active).toLocaleDateString() : "—"}</td><td><button className="more-button" onClick={() => onNavigate(`/learners/${learner.id}`)} aria-label={`View ${learner.name}`}>···</button></td></tr>)}</tbody></table></div>;
}

function LearnerManagement({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [roster, setRoster] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api("/instructor/learners").then((result) => setRoster(result.learners)).catch((error) => setLoadError(error.message)).finally(() => setLoading(false));
  }, []);
  const filtered = roster.filter((learner) => learner.name.toLowerCase().includes(search.toLowerCase()));
  return <>  <PageTitle eyebrow="HELP EVERY LEARNER SHINE" title="Learner management" description="Get to know your learners' progress, celebrate their wins, and find where they might need a hand." action={<Button onClick={() => onNavigate("/classrooms")}>＋ Add learners</Button>} /><section className="panel learner-management-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR LEARNERS</p><h2>{roster.length} learners</h2></div><label className="search-field compact-search"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a learner" /></label></div>{loadError && <p className="inline-error">Could not load learners: {loadError}</p>}{filtered.length > 0 && <LearnerTable rows={filtered} onNavigate={onNavigate} />}{loading && <div className="empty-table">Loading your learner roster…</div>}{!loading && !loadError && filtered.length === 0 && <div className="empty-table">{roster.length ? "No learners match that name." : "No active learners are connected to your classrooms yet."}</div>}<div className="table-footer"><span>Showing {filtered.length} of {roster.length} learners</span></div></section><div className="gentle-note"><Icon name="heart" size={18} /><span>Learner information is private to your classroom. Please handle it with care.</span></div></>;
}

function LearnerDetails() {
  const { id } = useParams();
  const [learner, setLearner] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    setLearner(null);
    setEvents([]);
    setLoadError("");
    api(`/instructor/learners/${id}`)
      .then((result) => {
        if (!active) return;
        setLearner(result.learner);
        setEvents(result.events || []);
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      });
    return () => { active = false; };
  }, [id]);

  if (loadError) return <><PageTitle eyebrow="LEARNER PROFILE" title="Learner details" /><p className="inline-error">Could not load this learner: {loadError}</p></>;
  if (!learner) return <div className="empty-state">Loading learner details…</div>;

  const initials = learner.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return <><PageTitle eyebrow="LEARNER PROFILE" title={learner.name} description={`A closer look at ${learner.name.split(" ")[0]}'s learning journey.`} action={<span className="soft-tag">CLASSROOM LEARNER</span>} /><div className="learner-detail-hero panel"><span className="avatar avatar-large avatar-mint">{initials}</span><div><h2>{learner.name}</h2><p>{learner.level} level · Joined through your classroom</p></div><Button variant="outline" onClick={() => window.print()}>↓ Export summary</Button></div><div className="stats-grid"><StatCard icon="bookOpen" tone="lavender" label="Completed activities" value={learner.activities} change="Since joining" /><StatCard icon="hand" tone="peach" label="Practice accuracy" value={learner.accuracy == null ? "—" : `${learner.accuracy}%`} change="Across completed activities" /><StatCard icon="sun" tone="yellow" label="Last active" value={learner.last_active ? new Date(learner.last_active).toLocaleDateString() : "—"} change={learner.last_active ? new Date(learner.last_active).toLocaleTimeString() : "No completed activity yet"} /><StatCard icon="sprout" tone="mint" label="Current level" value={learner.level} change="Based on completed activity accuracy" /></div><div className="progress-content-grid"><section className="panel"><p className="eyebrow">GROWING EVERY WEEK</p><h2>Recent activity</h2>{events.length ? <div className="timeline">{events.map((event, index) => <div key={`${event.activity}-${event.created_at}-${index}`}><i className={`timeline-dot ${["mint", "peach", "lavender"][index % 3]}`} /><span><strong>{event.activity} · {event.score}%</strong><small>{new Date(event.created_at).toLocaleString()}</small></span></div>)}</div> : <p>No completed activities yet. Their progress will appear here as they practice.</p>}</section><section className="panel"><p className="eyebrow">A LITTLE ENCOURAGEMENT</p><h2>Strengths & next steps</h2><div className="insight-row"><Icon name="star" size={20} /><div><strong>Keep celebrating each try</strong><small>Consistent practice helps build confidence.</small></div></div><div className="insight-row"><Icon name="sprout" size={20} /><div><strong>Explore a new sign together</strong><small>Small steps make a meaningful difference.</small></div></div></section></div></>;
}

function Classrooms({ onNavigate }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    api("/instructor/classrooms").then((result) => setClassrooms(result.classrooms)).catch((error) => setLoadError(error.message));
  }, []);
  return <>
    <PageTitle eyebrow="LEARNING IS BETTER TOGETHER" title="Virtual classrooms" description="Create a welcoming place where learners can practice, grow, and cheer one another on." action={<Button onClick={() => onNavigate("/classrooms/create")}>＋ Create classroom</Button>} />
    {loadError && <p className="inline-error">Could not load classrooms: {loadError}</p>}
    <div className="classroom-list">
      {classrooms.map((classroom, index) => (
        <article className="classroom-card panel" key={classroom.code}>
          <div className={`classroom-icon ${index % 2 === 0 ? "mint" : "lavender"}`}><Icon name={index % 2 === 0 ? "home" : "school"} size={27} /></div>
          <div className="classroom-details">
            <span className="room-status">ACTIVE CLASSROOM</span>
            <h2>{classroom.name}</h2>
            <p>{classroom.student_count} learner{classroom.student_count === 1 ? "" : "s"} <i>·</i> {classroom.created_at ? `Created ${new Date(`${classroom.created_at.replace(" ", "T")}Z`).toLocaleDateString()}` : "Just created"}</p>
            <div className="class-code">CLASS CODE <strong>{classroom.code}</strong><button onClick={async () => { try { await navigator.clipboard.writeText(classroom.code); } catch { setLoadError("Clipboard access is unavailable in this browser."); } }}>Copy code</button></div>
          </div>
          <div className="classroom-actions">
            <Button variant="outline" onClick={() => onNavigate(`/classrooms/${classroom.id}/students`)}>Add students</Button>
            <Button variant="outline" onClick={() => onNavigate("/learners")}>View learners</Button>
          </div>
        </article>
      ))}
    </div>
    {classrooms.length === 0 && !loadError && <div className="empty-state"><Icon name="home" size={34} /><h2>No classrooms yet</h2><p>Create a classroom to invite learners into your space.</p></div>}
    <section className="invite-panel"><div><Icon name="mail" size={24} /><h2>Invite learners into your classroom</h2><p>Share your classroom code with learners who already have a Talinturo account so they can join.</p></div><Button variant="outline" onClick={() => onNavigate("/classrooms/create")}>Create a classroom</Button></section>
  </>;
}

function LearnerClassrooms({ onToast }) {
  const [classrooms, setClassrooms] = useState([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api("/classrooms")
      .then((result) => setClassrooms(result.classrooms))
      .catch((error) => setLoadError(error.message));
  }, []);

  const joinClassroom = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api("/classrooms/join", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      setClassrooms((current) => [...current, result.classroom]);
      setCode("");
      onToast(`You joined ${result.classroom.name}!`);
    } catch (error) {
      onToast(`Couldn't join classroom: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return <>
    <PageTitle eyebrow="LEARNING IS BETTER TOGETHER" title="My classrooms" description="Join a learning community with a classroom code from your instructor." />
    {loadError && <p className="inline-error">Could not load classrooms: {loadError}</p>}
    <div className="students-layout">
      <form className="form-panel panel" onSubmit={joinClassroom}>
        <p className="eyebrow">JOIN YOUR COMMUNITY</p>
        <h2>Enter a classroom code</h2>
        <p className="form-description">Ask your instructor for their code, then join with your Talinturo account.</p>
        <label>Classroom code<input required maxLength={100} value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. SUNNY24" /></label>
        <div className="form-actions"><Button type="submit" disabled={loading}>{loading ? "Joining…" : "Join classroom"} <span>→</span></Button></div>
      </form>
      <section className="panel roster-panel">
        <div className="panel-heading"><div><p className="eyebrow">YOUR LEARNING CREW</p><h2>{classrooms.length} classroom{classrooms.length === 1 ? "" : "s"}</h2></div><span className="soft-tag">ACTIVE</span></div>
        {classrooms.length ? classrooms.map((classroom) => <article className="roster-row" key={classroom.id}>
          <span className="classroom-icon mint"><Icon name="school" size={22} /></span>
          <span><strong>{classroom.name}</strong><small>{classroom.description || "A place to learn together"}</small></span>
        </article>) : <div className="empty-state"><Icon name="sprout" size={34} /><h2>Find your learning crew</h2><p>When you join a classroom, it will show up here.</p></div>}
      </section>
    </div>
  </>;
}

function AddStudents({ onNavigate, onToast, demoMode }) {
  const { id } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    api(`/instructor/classrooms/${id}/students`).then((result) => {
      setClassroom(result.classroom);
      setStudents(result.students);
    }).catch((error) => setLoadError(error.message));
  }, [id]);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api(`/instructor/classrooms/${id}/students`, { method: "POST", body: JSON.stringify({ name, email }) });
      setStudents((current) => [...current, result.student]);
      setName("");
      setEmail("");
      onToast("Learner added to your classroom.");
    } catch (error) {
      onToast(`Couldn't add learner: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  return <><PageTitle eyebrow="GROW YOUR LEARNING COMMUNITY" title="Add students" description={demoMode ? "Add a learner to this local demo classroom." : "Add a learner who already has a Talinturo account using their registered email."} action={<Button variant="outline" onClick={() => onNavigate("/classrooms")}>← Classrooms</Button>} /><section className="classroom-detail-banner panel"><Icon name="home" size={27} /><div><small>CLASSROOM</small><h2>{classroom?.name || "Your classroom"}</h2><p>Class code <strong>{classroom?.code || "…"}</strong></p></div></section><div className="students-layout"><form className="form-panel panel" onSubmit={submit}><p className="eyebrow">{demoMode ? "LOCAL DEMO ROSTER" : "REGISTERED LEARNER"}</p><h2>Add a learner</h2><p className="form-description">{demoMode ? "Add a name and email address to this local demo roster." : "Enter the email address on their Talinturo account. Or share the classroom code so they can join themselves."}</p>{demoMode && <label>Learner name<input required maxLength={70} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sam Rivera" /></label>}<label>{demoMode ? "Family or learner email" : "Learner email"}<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><div className="form-actions"><Button type="submit" disabled={loading}>{loading ? "Adding…" : "Add to classroom"} <span>→</span></Button></div></form><section className="panel roster-panel"><div className="panel-heading"><div><p className="eyebrow">LEARNING TOGETHER</p><h2>{students.length} learner{students.length === 1 ? "" : "s"}</h2></div><span className="soft-tag">PRIVATE ROSTER</span></div>{loadError && <p className="inline-error">Could not load roster: {loadError}</p>}{students.length ? students.map((student) => <div className="roster-row" key={student.id}><span className="avatar avatar-mint">{student.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{student.name}</strong><small>{student.email}</small></span><span className="room-status">ACTIVE</span></div>) : <div className="empty-state"><Icon name="sprout" size={34} /><h2>A new beginning</h2><p>Your learners will appear here once added.</p></div>}</section></div></>;
}

function CreateClassroom({ onNavigate, onToast }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return onToast("Give your classroom a name before creating it.");
    setSubmitting(true);
    try {
      await api("/instructor/classrooms", { method: "POST", body: JSON.stringify({ name: name.trim(), description: description.trim() }) });
      onToast("Your new classroom is ready!");
      onNavigate("/classrooms");
    } catch (error) {
      onToast(`Couldn't create classroom: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  return <><PageTitle eyebrow="A SPACE TO LEARN TOGETHER" title="Create a classroom" description="Start a welcoming space where your learners can practice and grow together." /><form className="form-panel panel" onSubmit={submit}><div className="form-icon"><Icon name="home" size={27} /></div><label>Classroom name<input required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sunshine Sign Stars" /></label><label>A little about your class <span className="optional">(optional)</span><textarea rows="4" maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you learning together?" /></label><div className="form-note"><Icon name="lock" size={17} /><span>A unique invite code will be created for you. Only people with your code can request to join.</span></div><div className="form-actions"><button type="button" className="text-link" onClick={() => onNavigate("/classrooms")}>Cancel</button><Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create classroom"} <span>→</span></Button></div></form></>;
}

    function Profile({ user, onSave }) {
      const [name, setName] = useState(user.name);
      const [age, setAge] = useState(user.learner_type);
      const [goal, setGoal] = useState(user.learning_goal);
      const originalName = user.name || "";
      const hasChanges = name.trim() !== originalName.trim()
        || age !== user.learner_type
        || goal !== user.learning_goal;
      const canSave = Boolean(name.trim() && user.email?.trim() && age.trim() && goal.trim() && hasChanges);

      return <><PageTitle eyebrow="THIS IS YOUR SPACE" title="My profile" description="Make your learning space feel a little more like you." /><form className="profile-form panel" onSubmit={(event) => {
        event.preventDefault();
        if (canSave) onSave({ name: name.trim(), learner_type: age, learning_goal: goal });
      }}><div className="profile-edit-head"><span className="avatar avatar-large avatar-mint">{name.split(" ").map((part) => part[0]).slice(0, 2).join("") || "AR"}</span><div><h2>{name || "Your name"}</h2><p>{user.role === "instructor" ? "Instructor account" : "Learner account"}{user.created_at ? ` · Joined ${new Date(user.created_at).toLocaleDateString()}` : ""}</p></div><button type="button" className="button button-outline" onClick={() => document.getElementById("profile-name")?.focus()}>Edit details</button></div><div className="profile-fields"><label>Display name<input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={70} /></label><label>Email address<input type="email" value={user.email || ""} readOnly /></label><label>Learning as<select value={age} onChange={(event) => setAge(event.target.value)}><option>Adult learner</option><option>Child learner</option><option>Parent or caregiver</option><option>Educator</option></select></label><label>My learning goal<select value={goal} onChange={(event) => setGoal(event.target.value)}><option>Everyday conversations</option><option>Connect with family</option><option>Learn for my classroom</option><option>Explore Filipino culture</option></select></label></div><div className="form-actions"><Link className="text-link" to="/settings">Account settings →</Link><Button type="submit" disabled={!canSave}>Save changes</Button></div></form></>;
    }

    function Settings({ settings, setSettings, onSave, onToast }) {
      const toggle = (key) => {
        const next = { ...settings, [key]: !settings[key] };
        setSettings(next);
        localStorage.setItem("talinturo-settings", JSON.stringify(next));
      };
      const updateTheme = (themeMode) => {
        const next = { ...settings, themeMode };
        setSettings(next);
        localStorage.setItem("talinturo-settings", JSON.stringify(next));
      };
      return <><PageTitle eyebrow="MAKE IT YOUR OWN" title="Settings" description="A few little choices to make learning feel just right for you." /><div className="settings-layout"><section className="panel settings-panel theme-panel"><p className="eyebrow">YOUR LOOK & FEEL</p><h2>Appearance</h2><p className="theme-description">Choose light or dark. Save your preferences to sync this choice across devices.</p><div className="appearance-options" role="group" aria-label="Color theme"><button type="button" className={`appearance-option ${settings.themeMode === "light" ? "appearance-option-active" : ""}`} aria-pressed={settings.themeMode === "light"} onClick={() => updateTheme("light")}><Icon name="sun" size={21} /><span><strong>Light</strong><small>Bright and welcoming</small></span></button><button type="button" className={`appearance-option ${settings.themeMode === "dark" ? "appearance-option-active" : ""}`} aria-pressed={settings.themeMode === "dark"} onClick={() => updateTheme("dark")}><Icon name="moon" size={21} /><span><strong>Dark</strong><small>Easy on the eyes</small></span></button></div></section><section className="panel settings-panel"><p className="eyebrow">YOUR EXPERIENCE</p><h2>Learning preferences</h2><SettingRow title="Sound effects" text="Play a little sound when you finish an activity." checked={settings.sound} onChange={() => toggle("sound")} /><SettingRow title="Reduce motion" text="Use fewer animations throughout the app." checked={settings.reducedMotion} onChange={() => toggle("reducedMotion")} /></section><section className="panel settings-panel"><p className="eyebrow">KEEP IN THE LOOP</p><h2>Email updates</h2><SettingRow title="Weekly learning summary" text="A quick recap of your progress and little wins." checked={settings.weekly} onChange={() => toggle("weekly")} /><div className="setting-danger"><div><strong>Need a fresh start?</strong><small>Reset your local practice activity. Your account stays safe.</small></div><button onClick={() => onToast("Progress reset is not available in this demo.")}>Reset practice data</button></div></section><div className="settings-footer"><span>Save to your account to sync preferences across devices.</span><button className="button button-outline" onClick={() => onSave(settings)}>Save preferences</button></div></div></>;
    }

    function SettingRow({ title, text, checked, onChange }) {
      return <div className="setting-row"><div><strong>{title}</strong><small>{text}</small></div><button className={`switch ${checked ? "switch-on" : ""}`} role="switch" aria-checked={checked} aria-label={title} onClick={onChange}><span /></button></div>;
    }

    function Help() {
      const [open, setOpen] = useState(0);
      const questions = [
        ["What is Filipino Sign Language?", "Filipino Sign Language (FSL) is the natural sign language used by the Filipino Deaf community. It has its own grammar and vocabulary. FSL belongs to its community — this app is only a starting point for learning."],
        ["Can I use the camera to check my signs?", "The camera preview lets you see yourself while you practice. This demo does not recognize or score signs. For accurate learning, seek guidance from Deaf FSL signers and qualified teachers."],
        ["Is this app suitable for children?", "Talinturo is designed with gentle feedback and a learner-friendly layout. For children, use the app with a trusted adult or educator. This demo does not collect child account data beyond what you enter locally."],
        ["How do I join a virtual classroom?", "Ask your instructor for a classroom invite code. In this demo, classroom joining is represented by the learner management experience; learner invites can be connected to an account flow in a deployed version."],
        ["Is my camera video saved?", "No. The camera preview is processed by your browser only and is never recorded or uploaded by this application."],
      ];
      return <><PageTitle eyebrow="WE'RE HERE FOR YOU" title="Help & about" description="Questions are part of learning. Find a few answers and helpful notes below." /><section className="help-intro"><span><Icon name="heart" size={24} /></span><div><h2>Learning with respect, always.</h2><p>Talinturo is a small step toward making FSL learning more welcoming and accessible. FSL is a living language, and the Filipino Deaf community is its heart. We encourage learning directly from Deaf signers and educators.</p></div></section><section className="panel faq-panel"><p className="eyebrow">A FEW COMMON QUESTIONS</p><h2>How can we help?</h2>{questions.map(([question, answer], index) => <div className={`faq-item ${open === index ? "faq-open" : ""}`} key={question}><button onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}><strong>{question}</strong><span>{open === index ? "−" : "+"}</span></button>{open === index && <p>{answer}</p>}</div>)}</section><p className="help-contact">Still have questions? <a href="mailto:hello@talinturo.example">Say hello to our team</a>.</p></>;
    }

    function AuthPage({ mode, onAuth, onToast, instructorMode = false }) {
      const [email, setEmail] = useState("");
      const [password, setPassword] = useState("");
      const [name, setName] = useState("");
      const [loading, setLoading] = useState(false);
      const isSignup = mode === "signup";
      const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
          const result = await api(`/auth/${isSignup ? "signup" : "login"}`, { method: "POST", body: JSON.stringify({ email, password, name, ...(instructorMode ? { expected_role: "instructor" } : {}) }) });
          onAuth(result.user);
        } catch (error) {
          onToast(`Couldn't ${isSignup ? "create your account" : "sign in"}: ${error.message}`);
        } finally {
          setLoading(false);
        }
      };
      const startGoogleAuth = async () => {
        setLoading(true);
        try {
          await api("/health");
          window.location.assign(`/api/auth/google?flow=${mode}`);
        } catch (error) {
          onToast(`Couldn't reach the account service. Start the Flask API and try again. ${error.message}`);
          setLoading(false);
        }
      };
      return <div className={`auth-page ${!isSignup ? "login-auth-page" : ""} ${instructorMode ? "instructor-auth-page" : ""}`}><section className="auth-card panel"><Link to="/" className="auth-brand"><BrandLogo className="brand-logo-auth" /><strong>talinturo</strong></Link><span className="auth-flower"><Icon name={instructorMode ? "school" : "sparkles"} size={24} /></span><p className="eyebrow">{instructorMode ? "INSTRUCTOR PORTAL" : isSignup ? "YOUR FSL JOURNEY STARTS HERE" : "WELCOME BACK"}</p><h1>{instructorMode ? "Welcome back, educator." : isSignup ? "Let's make a little progress." : "It's nice to see you."}</h1><p className="auth-description">{instructorMode ? "Sign in to support your learners, manage classrooms, and keep every lesson moving." : isSignup ? "Create your learning space. Go at your pace, and celebrate every sign." : "Sign in and keep your learning journey going."}</p><form onSubmit={submit}>{isSignup && <label>Your name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={70} autoComplete="name" placeholder="How should we call you?" /></label>}<label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="email" placeholder="you@example.com" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={128} autoComplete={isSignup ? "new-password" : "current-password"} placeholder="At least 8 characters" /></label>{!isSignup && <Link className="forgot-link" to="/forgot-password">Forgot password?</Link>}<Button className="full-button" type="submit" disabled={loading}>{loading ? "One moment…" : isSignup ? "Create my account" : instructorMode ? "Sign in as instructor" : "Sign in"} <span>→</span></Button></form>{!instructorMode && <><div className="auth-divider"><span>or</span></div><Button variant="outline" className="full-button" disabled={loading} onClick={startGoogleAuth}>{loading ? "Connecting…" : `◎ ${isSignup ? "Sign up with Google" : "Continue with Google"}`}</Button></>}<p className="auth-switch">{instructorMode ? <>Learner? <Link to="/login">Sign in here</Link></> : isSignup ? "Already learning with us?" : "New to Talinturo?"} {!instructorMode && <Link to={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link>}</p>{!instructorMode && <p className="auth-oauth-note">Google securely verifies your email. {isSignup ? "Your account will be created after verification." : "Use the Google account linked to your Talinturo account."}</p>}</section><aside className="auth-side"><div className="auth-side-art"><span><Icon name="hand" size={53} /></span><i><Icon name="sparkles" size={19} /></i><b><Icon name="heart" size={24} /></b></div><h2>{instructorMode ? <>Teach with<br />connection.</> : <>Small signs.<br />Big connections.</>}</h2><p>{instructorMode ? "Create a learning space where every learner can move forward with confidence." : "Build a more inclusive world, one kind conversation at a time."}</p><span className="auth-side-caption">MADE FOR LEARNERS, FAMILIES & EDUCATORS</span></aside></div>;
    }

    function ForgotPassword({ onToast }) {
      const [email, setEmail] = useState("");
      const [sent, setSent] = useState(false);
      return <div className="auth-page"><section className="auth-card panel"><Link to="/" className="auth-brand"><BrandLogo className="brand-logo-auth" /><strong>talinturo</strong></Link><span className="auth-flower"><Icon name="mail" size={24} /></span><p className="eyebrow">A FRESH START</p><h1>{sent ? "Password reset isn't connected yet." : "Forgot your password?"}</h1><p className="auth-description">{sent ? "This local demo has no email delivery configured. Contact your administrator to reset your account." : "It happens! Enter your email to check the reset flow. Email delivery needs to be configured before a link can be sent."}</p>{sent ? <Button className="full-button" onClick={() => window.location.assign("/login")}>Back to sign in</Button> : <form onSubmit={(event) => { event.preventDefault(); setSent(true); }}><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><Button className="full-button" type="submit">Continue <span>→</span></Button></form>}<p className="auth-switch"><Link to="/login">← Back to sign in</Link></p></section><aside className="auth-side"><div className="auth-side-art"><span><Icon name="sprout" size={53} /></span><i><Icon name="sparkles" size={19} /></i><b><Icon name="heart" size={24} /></b></div><h2>One little step<br />at a time.</h2><p>Your learning journey will be right here when you return.</p><span className="auth-side-caption">MADE FOR LEARNERS, FAMILIES & EDUCATORS</span></aside></div>;
    }

    function ResetPassword() {
      return <section className="not-found panel"><Icon name="lock" size={44} /><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Password reset isn't configured.</h1><p>This local demo has no email delivery or reset-token service. Ask your administrator for help, or return to sign in.</p><Link className="button button-primary" to="/login">Back to sign in <span>→</span></Link></section>;
    }

function ProfileSetup({ onDone }) {
  const [goal, setGoal] = useState("Connect with family");
  const [learnerType, setLearnerType] = useState("Adult learner");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onDone({ learner_type: learnerType, learning_goal: goal });
    } catch (saveError) {
      setError(`Couldn't save your profile: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  return <div className="auth-page"><section className="auth-card panel"><Link to="/" className="auth-brand"><BrandLogo className="brand-logo-auth" /><strong>talinturo</strong></Link><span className="auth-flower"><Icon name="sprout" size={24} /></span><p className="eyebrow">LET'S MAKE THIS YOURS</p><h1>What brings you here?</h1><p className="auth-description">We'll use this to make your learning journey feel a little more personal.</p><form onSubmit={submit}><label>My learning goal<select value={goal} onChange={(event) => setGoal(event.target.value)}><option>Connect with family</option><option>Everyday conversations</option><option>Learn for my classroom</option><option>Explore Filipino culture</option></select></label><label>I'm learning as<select value={learnerType} onChange={(event) => setLearnerType(event.target.value)}><option>Adult learner</option><option>Child learner</option><option>Parent or caregiver</option><option>Educator</option></select></label>{error && <p className="inline-error" role="alert">{error}</p>}<Button className="full-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Let's get started"} <span>→</span></Button></form></section><aside className="auth-side"><div className="auth-side-art"><span><Icon name="globe" size={53} /></span><i><Icon name="sparkles" size={19} /></i><b><Icon name="heart" size={24} /></b></div><h2>Your story.<br />Your pace.</h2><p>There is no one way to learn. We'll meet you right where you are.</p><span className="auth-side-caption">MADE FOR LEARNERS, FAMILIES & EDUCATORS</span></aside></div>;
}

    function NotFound({ onNavigate }) {
      return <section className="not-found panel"><Icon name="compass" size={44} /><p className="eyebrow">A LITTLE DETOUR</p><h1>We can't find that page.</h1><p>Looks like this path has changed. Let's find another way together.</p><Button onClick={() => onNavigate("/")}>Back to my dashboard <span>→</span></Button></section>;
    }

export default App;
