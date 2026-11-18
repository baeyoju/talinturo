const titles = {
  "/": "Dashboard",
  "/paths": "Learning paths",
  "/vocabulary": "FSL vocabulary",
  "/practice": "Sign practice",
  "/scenarios": "Scenarios",
  "/progress": "My progress",
  "/challenge": "Level challenge",
  "/instructor": "Instructor dashboard",
  "/learners": "Learners",
  "/classrooms": "Classrooms",
  "/admin": "Administration",
  "/profile": "My profile",
  "/settings": "Settings",
  "/help": "Help & about",
};

export function pageTitle(pathname) {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith("/paths/") && pathname.includes("/lessons/")) return "Lesson";
  if (pathname.startsWith("/paths/")) return "Learning path";
  if (pathname.startsWith("/learners/")) return "Learner details";
  if (pathname.startsWith("/classrooms/")) return "Classroom";
  if (pathname.startsWith("/activity/")) return "Scenario";
  return "Talinturo";
}
