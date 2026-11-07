import { Link, NavLink, useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { adminNav, instructorNav, learnerNav } from "@/constants/navigation";
import { initials } from "@/lib/initials";

const accountLabel = { admin: "Administrator account", instructor: "Instructor account", learner: "Learner account" };

export function Sidebar({ open, role, user, currentStreak }) {
  const navigate = useNavigate();
  const items = role === "admin" ? adminNav : role === "instructor" ? instructorNav : learnerNav;
  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="sidebar-profile">
        <div className="avatar avatar-mint">{initials(user.name)}</div>
        <div><strong>{user.name}</strong><span>{accountLabel[role] || accountLabel.learner}</span></div>
        <span className="online-dot" />
      </div>
      <nav className="side-nav" aria-label="Main navigation">
        {items.map((item, index) =>
          item.heading ? <p className="nav-heading" key={item.heading}>{item.heading}</p> :
            <NavLink key={`${item.to}-${index}`} to={item.to} end={item.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "nav-active" : ""}`}>
              <span className="nav-icon"><Icon name={item.icon} size={19} /></span><span>{item.label}</span>
            </NavLink>,
        )}
      </nav>
      <div className="sidebar-bottom">
        {currentStreak !== null && <div className="sidebar-streak"><Icon name="flame" size={22} /><div><strong>{currentStreak} day streak</strong><small>{currentStreak ? "You're on a roll!" : "Start a practice activity"}</small></div><span className="streak-sparkle">✦</span></div>}
        <Link className="nav-link" to="/help"><span className="nav-icon">?</span><span>Help & about</span></Link>
        <button className="sidebar-account" onClick={() => navigate("/profile")}><span className="avatar avatar-small">{initials(user.name)}</span><span><strong>{user.name}</strong><small>View profile</small></span><span className="account-dots">···</span></button>
      </div>
    </aside>
  );
}
