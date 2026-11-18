import { Link, NavLink } from "react-router-dom";
import map from "@/assets/path/nav-map.svg";
import classroom from "@/assets/path/nav-classroom.svg";
import progress from "@/assets/path/nav-progress.svg";
import profile from "@/assets/path/nav-profile.svg";

export function PathNavigation() {
  return <aside className="sidebar path-navigation">
    <Link to="/paths" className="path-navigation__brand">TALINTURO</Link>
    <nav aria-label="Main navigation">{[
      ["PATH", "/paths", map], ["CLASSROOM", "/classrooms", classroom],
      ["PROGRESS", "/progress", progress], ["PROFILE", "/profile", profile],
    ].map(([label, to, src]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "is-active" : ""}>
      <img src={src} width="24" height="24" alt="" /><span>{label}</span>
    </NavLink>)}</nav>
  </aside>;
}
