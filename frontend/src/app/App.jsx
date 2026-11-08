import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from "framer-motion";
import { getPendingApiRequests, subscribeToApiLoading } from "@/adapters/http/api";
import ConnieLoader from "@/components/brand/ConnieLoader";
import { Toast } from "@/components/feedback/Toast";
import { Footer } from "@/components/layout/Footer";
import { PageMotionContext } from "@/components/layout/PageMotionContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useOAuthErrorToast } from "./hooks/useOAuthErrorToast";
import { useSession } from "./hooks/useSession";
import { useSettings } from "./hooks/useSettings";
import { AuthedRoutes, PublicRoutes } from "./routes";

export function App() {
  const prefersReducedMotion = useReducedMotion();
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const workspaceRef = useRef(null);
  const topbarRef = useRef(null);
  const pendingApiRequests = useSyncExternalStore(subscribeToApiLoading, getPendingApiRequests, getPendingApiRequests);
  const location = useLocation();
  const navigate = useNavigate();
  const previousPathnameRef = useRef(location.pathname);

  const session = useSession({ onToast: setToast });
  const { role, user, setUser, demoMode, currentStreak, isAuthenticated, authLoading, apiOnline, acceptAuth } = session;
  const { settings, setSettings, savePreferences } = useSettings({ isAuthenticated, userId: user.id, onToast: setToast });
  useOAuthErrorToast({ onToast: setToast });

  // Keep the sidebar offset in sync with the top bar height.
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

  // Close the mobile sidebar after navigating.
  useEffect(() => {
    const pathnameChanged = previousPathnameRef.current !== location.pathname;
    previousPathnameRef.current = location.pathname;
    if (pathnameChanged && sidebarOpen) setSidebarOpen(false);
  }, [location.pathname, sidebarOpen]);

  const switchRole = async (nextRole) => {
    await session.switchDemoRole(nextRole);
    navigate(nextRole === "instructor" ? "/instructor" : "/");
  };

  const signOut = async () => {
    setSidebarOpen(false);
    const signedOut = await session.signOut();
    if (!signedOut) return;
    setToast("You have been signed out.");
    navigate("/");
  };

  const dark = settings.themeMode === "dark";
  const appStyle = {
    "--green": dark ? "#a9bcff" : "#1e40c2",
    "--green-dark": dark ? "#8ba5ff" : "#1835a0",
    "--green-soft": dark ? "#293456" : "#e8edff",
    "--canvas": dark ? "#17191f" : "#f7f1e5",
    "--ink": dark ? "#f4f1eb" : "#383737",
    "--ink-shadow": "none",
    "--muted": dark ? "#b1b2b8" : "#807a71",
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
        <PublicRoutes navigate={navigate} acceptAuth={acceptAuth} onToast={setToast} />
        <ConnieLoader active={pendingApiRequests > 0} />
        <Toast message={toast} onClose={() => setToast("")} />
      </div>
    );
  }

  return (
    <div ref={workspaceRef} className={`app-shell workspace-shell ${sidebarOpen && !onboardingInProgress ? "navigation-open" : ""}`} data-theme={settings.themeMode} data-reduced-motion={shouldReduceMotion} style={appStyle}>
      {!onboardingInProgress && <Sidebar open={sidebarOpen} role={role} user={user} currentStreak={currentStreak} />}
      <div className="main-column">
        <TopBar
          headerRef={topbarRef}
          user={user}
          role={role}
          demoMode={demoMode}
          apiOnline={apiOnline}
          currentStreak={currentStreak}
          showNavToggle={!onboardingInProgress}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          onCloseSidebar={() => setSidebarOpen(false)}
          onSwitchRole={switchRole}
          onSignOut={signOut}
        />
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
                <AuthedRoutes
                  role={role}
                  user={user}
                  setUser={setUser}
                  demoMode={demoMode}
                  settings={settings}
                  setSettings={setSettings}
                  savePreferences={savePreferences}
                  navigate={navigate}
                  acceptAuth={acceptAuth}
                  onToast={setToast}
                />
              </m.main>
            </AnimatePresence>
          </PageMotionContext.Provider>
        </LazyMotion>
        <Footer />
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
      <ConnieLoader active={pendingApiRequests > 0} />
    </div>
  );
}
