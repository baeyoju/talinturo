import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/initials";
import { pageTitle } from "@/lib/pageTitle";

export function TopBar({ headerRef, user, role, demoMode, apiOnline, currentStreak, showNavToggle, sidebarOpen, onToggleSidebar, onCloseSidebar, onSwitchRole, onSignOut }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <header ref={headerRef} className="topbar">
      <div className="breadcrumb">
        <Link className="header-brand" to="/" aria-label="Talinturo home">
          <BrandLogo className="brand-logo-header" />
          <span className="header-brand-name">talinturo<small>FSL, one sign at a time</small></span>
        </Link>
        <b>/</b>
        <strong>{pageTitle(location.pathname)}</strong>
        {showNavToggle && <button
          className="sidebar-toggle"
          type="button"
          aria-label={sidebarOpen ? "Hide navigation" : "Show navigation"}
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
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
        {demoMode && <button className="role-switch" onClick={() => onSwitchRole(role === "instructor" ? "learner" : "instructor")}>{role === "instructor" ? "Learner view" : "Instructor view"} <span>↗</span></button>}
        <div className="profile-menu-wrap">
          <button className="top-profile" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}><span className="avatar avatar-small">{initials(user.name)}</span><span>{user.name.split(" ")[0]}</span></button>
          {menuOpen && <div className="profile-menu">
            <Link to="/profile" onClick={onCloseSidebar}>My profile</Link>
            <Link to="/settings" onClick={onCloseSidebar}>Settings</Link>
            <button onClick={onSignOut}>Sign out</button>
          </div>}
        </div>
      </div>
    </header>
  );
}
