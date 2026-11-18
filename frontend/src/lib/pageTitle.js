const titles = {
  "/": "Home",
  "/paths": "Learning paths",
  "/vocabulary": "Vocabulary",
  "/practice": "Practice",
  "/scenarios": "Scenarios",
  "/challenge": "Challenge",
  "/progress": "Progress",
  "/classrooms": "Classrooms",
  "/learners": "Learners",
  "/instructor": "Instructor workspace",
  "/admin": "Admin workspace",
  "/profile": "Profile",
  "/settings": "Settings",
  "/help": "Help & about",
};

export function pageTitle(pathname) {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith("/paths/")) return "Learning path";
  if (pathname.startsWith("/profile/")) return "Profile setup";
  if (pathname.startsWith("/learners/")) return "Learner details";
  return "Talinturo";
}
