export const learnerNav = [
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

export const instructorNav = [
  { heading: "TEACH" },
  { label: "Instructor dashboard", to: "/instructor", icon: "home" },
  { label: "Learners", to: "/learners", icon: "users" },
  { label: "Virtual classrooms", to: "/classrooms", icon: "school" },
  { heading: "YOUR ACCOUNT" },
  { label: "My progress", to: "/progress", icon: "star" },
];

export const adminNav = [
  { heading: "ADMINISTRATION" },
  { label: "Overview", to: "/admin", icon: "home" },
];

export function roleHome(role) {
  return role === "admin" ? "/admin" : role === "instructor" ? "/instructor" : "/";
}
