import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "./api.js";

const learnerNav = [
  { heading: "LEARN" },
  { label: "Dashboard", to: "/", icon: "⌂" },
  { label: "Learning paths", to: "/paths", icon: "▤" },
  { label: "FSL vocabulary", to: "/vocabulary", icon: "Aa" },
  { label: "Sign practice", to: "/practice", icon: "✋" },
  { label: "Scenarios", to: "/scenarios", icon: "◉" },
  { heading: "YOUR JOURNEY" },
  { label: "My progress", to: "/progress", icon: "↗" },
  { label: "Level challenge", to: "/challenge", icon: "✦" },
];

const instructorNav = [
  { heading: "TEACH" },
  { label: "Instructor dashboard", to: "/instructor", icon: "⌂" },
  { label: "Learners", to: "/learners", icon: "♧" },
  { label: "Virtual classrooms", to: "/classrooms", icon: "▦" },
  { heading: "YOUR ACCOUNT" },
  { label: "My progress", to: "/progress", icon: "↗" },
];

const lessons = [
  { id: "greetings", title: "Kumusta! Let's say hello", unit: "FSL Foundations", level: "Beginner", minutes: 8, icon: "👋", color: "peach", progress: 75 },
  { id: "introductions", title: "All about me", unit: "FSL Foundations", level: "Beginner", minutes: 12, icon: "🙋", color: "lavender", progress: 0 },
  { id: "everyday", title: "Everyday essentials", unit: "Daily conversations", level: "Beginner", minutes: 10, icon: "☀️", color: "yellow", progress: 0 },
];

const words = [
  { word: "Kumusta", meaning: "Hello / How are you?", category: "Greetings", emoji: "👋", hint: "A friendly greeting to start a conversation." },
  { word: "Salamat", meaning: "Thank you", category: "Everyday", emoji: "💛", hint: "Show gratitude with this everyday sign." },
  { word: "Pamilya", meaning: "Family", category: "People", emoji: "👨‍👩‍👧", hint: "Talk about the people closest to you." },
  { word: "Kaibigan", meaning: "Friend", category: "People", emoji: "🧑‍🤝‍🧑", hint: "Someone you enjoy spending time with." },
  { word: "Tubig", meaning: "Water", category: "Everyday", emoji: "💧", hint: "A useful sign for asking for a drink." },
  { word: "Paalam", meaning: "Goodbye", category: "Greetings", emoji: "🌤️", hint: "A warm way to end a conversation." },
];

const learners = [
  { id: 1, name: "Mia Santos", initials: "MS", age: 12, level: "Sprout", lessons: 18, accuracy: 92, streak: 6, color: "coral" },
  { id: 2, name: "Ethan Cruz", initials: "EC", age: 14, level: "Explorer", lessons: 24, accuracy: 86, streak: 3, color: "blue" },
  { id: 3, name: "Lia Reyes", initials: "LR", age: 11, level: "Sprout", lessons: 11, accuracy: 78, streak: 2, color: "purple" },
  { id: 4, name: "Noah Garcia", initials: "NG", age: 13, level: "Trailblazer", lessons: 31, accuracy: 95, streak: 9, color: "gold" },
];

const scenarios = [
  { title: "At the sari-sari store", tag: "Everyday life", emoji: "🏪", color: "peach", description: "Practice asking for what you need in a friendly neighborhood shop." },
  { title: "Meeting a new friend", tag: "Social", emoji: "🧑‍🤝‍🧑", color: "lavender", description: "Introduce yourself and learn a little about someone new." },
  { title: "Lunchtime at school", tag: "School", emoji: "🍱", color: "mint", description: "Share what you like and ask a classmate a question." },
];

function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, 3400);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  return message ? <div className="toast" role="status">{message}<button aria-label="Dismiss notification" onClick={onClose}>×</button></div> : null;
}

function App() {
  const [role, setRole] = useState(localStorage.getItem("talinturo-role") || "learner");
  const [user, setUser] = useState({
    name: localStorage.getItem("talinturo-name") || "Alex Rivera",
    email: role === "instructor" ? "teacher@example.com" : "learner@example.com",
    role,
    learner_type: "Adult learner",
    learning_goal: "Everyday conversations",
  });
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    api("/auth/demo", { method: "POST", body: JSON.stringify({ role }) })
      .then((result) => {
        setApiOnline(true);
        setUser((current) => ({ ...result.user, name: localStorage.getItem("talinturo-name") || result.user.name }));
      })
      .catch(() => setApiOnline(false));
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

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
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (error) {
      setToast(`Could not sign out: ${error.message}`);
      return;
    }
    localStorage.removeItem("talinturo-name");
    setUser({ name: "Alex Rivera", role });
    setToast("You have been signed out.");
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <Link className="brand" to="/" aria-label="Talinturo home">
          <span className="brand-mark">t<span>✳</span></span>
          <span className="brand-name">talinturo<small>FSL, one sign at a time</small></span>
        </Link>
        <div className="sidebar-profile">
          <div className="avatar avatar-mint">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
          <div><strong>{user.name}</strong><span>{role === "instructor" ? "Instructor account" : "Level 2 · Explorer"}</span></div>
          <span className="online-dot" />
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {(role === "instructor" ? instructorNav : learnerNav).map((item, index) =>
            item.heading ? <p className="nav-heading" key={item.heading}>{item.heading}</p> :
              <NavLink key={`${item.to}-${index}`} to={item.to} end={item.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "nav-active" : ""}`}>
                <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
                {item.label === "Level challenge" && <span className="nav-pill">NEW</span>}
              </NavLink>,
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-streak"><span>🔥</span><div><strong>6 day streak</strong><small>You're on a roll!</small></div><span className="streak-sparkle">✦</span></div>
          <Link className="nav-link" to="/help"><span className="nav-icon">?</span><span>Help & about</span></Link>
          <button className="sidebar-account" onClick={() => navigate("/profile")}><span className="avatar avatar-small">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{user.name}</strong><small>View profile</small></span><span className="account-dots">···</span></button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(!mobileOpen)}>☰</button>
          <div className="breadcrumb"><span>Talinturo</span><b>/</b><strong>{pageTitle(location.pathname)}</strong></div>
          <div className="top-actions">
            {apiOnline === false && <span className="api-status"><i /> Offline demo</span>}
            <button className="streak-top" aria-label="Current streak"><span>🔥</span> 6 <small>day streak</small></button>
            <button className="role-switch" onClick={() => changeRole(role === "instructor" ? "learner" : "instructor")}>{role === "instructor" ? "Learner view" : "Instructor view"} <span>↗</span></button>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setToast("You're all caught up. Keep up the great work!")}>♧<i /></button>
            <div className="profile-menu-wrap">
              <button className="top-profile" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}><span className="avatar avatar-small">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span>{user.name.split(" ")[0]}</span><b>⌄</b></button>
              {menuOpen && <div className="profile-menu"><Link to="/profile">My profile</Link><Link to="/settings">Settings</Link><button onClick={signOut}>Sign out</button></div>}
            </div>
          </div>
        </header>
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard user={user} onNavigate={navigate} />} />
            <Route path="/paths" element={<LearningPaths onNavigate={navigate} />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="/practice" element={<Practice onToast={setToast} />} />
            <Route path="/scenarios" element={<Scenarios onNavigate={navigate} />} />
            <Route path="/activity" element={<ScenarioActivity onNavigate={navigate} onToast={setToast} />} />
            <Route path="/results" element={<ActivityResults onNavigate={navigate} />} />
            <Route path="/challenge" element={<Challenge onNavigate={navigate} onToast={setToast} />} />
            <Route path="/challenge/success" element={<ChallengeFeedback success onNavigate={navigate} />} />
            <Route path="/challenge/try-again" element={<ChallengeFeedback onNavigate={navigate} />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/instructor" element={<InstructorDashboard onNavigate={navigate} />} />
            <Route path="/learners" element={<LearnerManagement onNavigate={navigate} />} />
            <Route path="/learners/:id" element={<LearnerDetails />} />
            <Route path="/classrooms" element={<Classrooms onNavigate={navigate} />} />
            <Route path="/classrooms/create" element={<CreateClassroom onNavigate={navigate} onToast={setToast} />} />
            <Route path="/classrooms/:id/students" element={<AddStudents onNavigate={navigate} onToast={setToast} />} />
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
            <Route path="/settings" element={<Settings onToast={setToast} />} />
            <Route path="/help" element={<Help />} />
            <Route path="/login" element={<AuthPage mode="login" onAuth={(account) => { localStorage.setItem("talinturo-name", account.name); localStorage.setItem("talinturo-role", account.role); setRole(account.role); setUser(account); navigate(account.role === "instructor" ? "/instructor" : "/"); }} onToast={setToast} />} />
            <Route path="/signup" element={<AuthPage mode="signup" onAuth={(account) => { localStorage.setItem("talinturo-name", account.name); localStorage.setItem("talinturo-role", "learner"); setRole("learner"); setUser(account); navigate("/profile/setup"); }} onToast={setToast} />} />
            <Route path="/profile/setup" element={<ProfileSetup onDone={() => navigate("/")} />} />
            <Route path="/forgot-password" element={<ForgotPassword onToast={setToast} />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="*" element={<NotFound onNavigate={navigate} />} />
          </Routes>
        </main>
        <footer className="footer"><span>Made with <b>♥</b> for a more inclusive world</span><span>© 2026 Talinturo <i>·</i> <Link to="/help">About</Link> <i>·</i> <Link to="/help">Privacy</Link></span></footer>
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function pageTitle(path) {
  if (path.startsWith("/learners/")) return "Learner details";
  if (path.startsWith("/classrooms/create")) return "Create classroom";
  if (/^\/classrooms\/\d+\/students$/.test(path)) return "Add students";
  if (path.startsWith("/challenge/")) return "Challenge results";
  const found = [...learnerNav, ...instructorNav].find((item) => item.to === path);
  const titles = { "/activity": "Scenario activity", "/results": "Activity results", "/profile": "My profile", "/settings": "Settings", "/help": "Help & about", "/login": "Welcome", "/welcome": "Welcome", "/signup": "Create account", "/forgot-password": "Reset password", "/reset-password": "Reset password", "/profile/setup": "Set up your profile" };
  return found?.label || titles[path] || "Not found";
}

function PageTitle({ eyebrow, title, description, action }) {
  return <div className="page-title"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div>{action}</div>}</div>;
}

function Button({ children, variant = "primary", className = "", ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

function ProgressBar({ value, color = "green" }) {
  return <div className={`progress-track progress-${color}`}><span style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}

function Dashboard({ user, onNavigate }) {
  return <>
    <section className="welcome-banner">
      <div className="welcome-copy"><span className="welcome-label"><span>✦</span> YOUR LEARNING SPACE</span><h1>Magandang umaga, {user.name.split(" ")[0]}! <span>☀️</span></h1><p>Every sign is a little step toward understanding. Ready to learn something new?</p><Button onClick={() => onNavigate("/paths")}>Pick up where you left off <span>→</span></Button></div>
      <div className="welcome-art" aria-hidden="true"><div className="sun-disc">✦</div><div className="art-speech">kumusta!</div><div className="art-hand">🤟</div><span className="art-star star-one">✦</span><span className="art-star star-two">✳</span><span className="art-dot" /></div>
      <span className="banner-decoration">✿</span>
    </section>
    <section className="stats-grid">
      <StatCard icon="📚" tone="lavender" label="Lessons completed" value="12" change="+2 this week" />
      <StatCard icon="✋" tone="peach" label="Signs practiced" value="48" change="+8 this week" />
      <StatCard icon="⏱" tone="mint" label="Learning time" value="3h 25m" change="This month" />
      <StatCard icon="🔥" tone="yellow" label="Day streak" value="6 days" change="Personal best: 9" />
    </section>
    <div className="dashboard-grid">
      <section className="panel continue-panel">
        <div className="panel-heading"><div><p className="eyebrow">KEEP YOUR MOMENTUM</p><h2>Continue learning</h2></div><button className="text-link" onClick={() => onNavigate("/paths")}>All lessons <span>→</span></button></div>
        <div className="continue-lesson"><div className="lesson-illustration peach">👋</div><div className="continue-info"><div className="lesson-meta"><span>FSL FOUNDATIONS</span><span>LESSON 3 OF 4</span></div><h3>Greetings & introductions</h3><div className="lesson-progress-row"><ProgressBar value={75} /><span>75%</span></div></div></div>
        <div className="lesson-bottom"><span>⏱ About 8 min left</span><Button onClick={() => onNavigate("/paths")}>Continue lesson <span>→</span></Button></div>
      </section>
      <section className="panel week-panel">
        <div className="panel-heading"><div><p className="eyebrow">LITTLE STEPS, BIG WINS</p><h2>Your week</h2></div><button className="more-button" aria-label="More weekly statistics">···</button></div>
        <div className="week-number"><strong>4</strong><span>learning days this week <b>↗ 2 more</b></span></div>
        <div className="week-chart" aria-label="Learning activity from Monday through Sunday">{[28, 54, 42, 78, 40, 90, 18].map((height, index) => <div className="week-column" key={index}><div className={index === 5 ? "week-bar week-today" : "week-bar"} style={{ height: `${height}%` }} />{["M", "T", "W", "T", "F", "S", "S"][index] && <small>{["M", "T", "W", "T", "F", "S", "S"][index]}</small>}</div>)}</div>
        <div className="weekly-goal"><div><span className="goal-icon">✦</span><span><strong>Weekly goal</strong><small>4 of 5 learning days</small></span></div><span className="goal-count">4/5</span></div><ProgressBar value={80} color="peach" />
      </section>
      <section className="panel path-panel">
        <div className="panel-heading"><div><p className="eyebrow">MADE FOR YOUR JOURNEY</p><h2>Your learning paths</h2></div><button className="text-link" onClick={() => onNavigate("/paths")}>Explore all <span>→</span></button></div>
        <div className="path-cards">
          <PathPreview icon="🌱" color="mint" title="FSL Foundations" lessons="8 lessons" progress={62} />
          <PathPreview icon="💬" color="lavender" title="Everyday conversations" lessons="6 lessons" progress={25} />
          <PathPreview icon="🌟" color="yellow" title="Express yourself" lessons="10 lessons" progress={0} />
        </div>
      </section>
      <section className="daily-card">
        <span className="daily-sparkle">✦</span><p className="eyebrow">TODAY'S LITTLE CHALLENGE</p><h2>Can you sign<br />“thank you”?</h2><p>Practice one useful sign today and add a little kindness to someone's day.</p><Button variant="light" onClick={() => onNavigate("/practice")}>Practice now <span>→</span></Button><div className="daily-emoji">💛</div>
      </section>
    </div>
    <div className="dashboard-bottom">
      <section className="panel achievements-panel"><div className="panel-heading"><div><p className="eyebrow">LOOK AT YOU GO</p><h2>Recent achievements</h2></div><button className="text-link" onClick={() => onNavigate("/progress")}>View all <span>→</span></button></div><div className="achievement-row"><div className="achievement-badge badge-sun">☀️</div><div><strong>Early bird</strong><small>Learned before 9 am</small></div><span className="achievement-new">JUST NOW</span></div><div className="achievement-row"><div className="achievement-badge badge-heart">💛</div><div><strong>Kind communicator</strong><small>Practiced 10 everyday signs</small></div><span className="achievement-date">Yesterday</span></div></section>
      <section className="quote-card"><span>“</span><blockquote>Every sign you learn opens a little more of the world.</blockquote><small>YOUR TALINTURO REMINDER</small><div className="quote-flower">✿</div></section>
    </div>
  </>;
}

function StatCard({ icon, tone, label, value, change }) {
  return <div className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><div className="stat-copy"><small>{label}</small><strong>{value}</strong><span>{change}</span></div><span className="stat-menu">···</span></div>;
}

function PathPreview({ icon, color, title, lessons: count, progress }) {
  return <div className="path-preview"><div className={`path-preview-icon ${color}`}>{icon}</div><div className="path-preview-body"><div><strong>{title}</strong><small>{count}</small></div><ProgressBar value={progress} /><small>{progress ? `${progress}% complete` : "Ready when you are"}</small></div></div>;
}

function LearningPaths({ onNavigate }) {
  const [filter, setFilter] = useState("All paths");
  const visibleLessons = lessons.filter((lesson) => filter === "All paths" || (filter === "In progress" && lesson.progress > 0) || (filter === "Not started" && lesson.progress === 0) || (filter === "Completed" && lesson.progress === 100));
  return <>
    <PageTitle eyebrow="LEARN AT YOUR OWN PACE" title="Learning paths" description="A little practice each day goes a long way. Find the path that feels right for you." action={<Button onClick={() => onNavigate("/practice")}>✋ Quick practice</Button>} />
    <div className="filter-row">{["All paths", "In progress", "Not started", "Completed"].map((item) => <button key={item} className={`filter-chip ${filter === item ? "filter-active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}</div>
    {visibleLessons.length ? <div className="learning-path-grid">{visibleLessons.map((lesson) => <article className="path-card" key={lesson.id}><div className={`path-card-art ${lesson.color}`}><span className="path-emoji">{lesson.icon}</span><span className="path-level">{lesson.level}</span><span className="path-sparkle">✦</span></div><div className="path-card-content"><span className="eyebrow">{lesson.unit}</span><h2>{lesson.title}</h2><p>{lesson.id === "greetings" ? "Start conversations with confidence using friendly greetings and introductions." : lesson.id === "introductions" ? "Share your name, feelings, and the things that make you, you." : "Learn the useful signs you'll reach for every day."}</p><div className="path-card-meta"><span>▤ {lesson.id === "greetings" ? "4" : "6"} bite-sized lessons</span><span>⏱ {lesson.minutes} min each</span></div><div className="path-card-progress"><ProgressBar value={lesson.progress} /><span>{lesson.progress ? `${lesson.progress}%` : "Not started"}</span></div><Button variant={lesson.progress ? "primary" : "outline"} onClick={() => onNavigate("/practice")}>{lesson.progress ? "Continue path" : "Start learning"} <span>→</span></Button></div></article>)}</div> : <div className="empty-state"><span>🌱</span><h2>No paths in this group yet</h2><p>Your next learning adventure is just around the corner.</p></div>}
    <section className="encouragement-strip"><span>🌈</span><div><strong>Learning looks different for everyone.</strong><p>Go at your own pace. There's no wrong way to make progress.</p></div><button className="text-link" onClick={() => onNavigate("/help")}>Our approach →</button></section>
  </>;
}

function Vocabulary() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All signs");
  const [saved, setSaved] = useState([]);
  const filtered = words.filter((item) => (category === "All signs" || item.category === category) && `${item.word} ${item.meaning}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageTitle eyebrow="A LITTLE WORD, A BIG CONNECTION" title="FSL vocabulary" description="Discover useful Filipino Sign Language signs and add your favorites to practice later." />
    <div className="vocab-controls"><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search signs..." /><kbd>⌘ K</kbd></label><div className="filter-row">{["All signs", "Greetings", "Everyday", "People"].map((item) => <button key={item} className={`filter-chip ${category === item ? "filter-active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
    {filtered.length ? <div className="vocab-grid">{filtered.map((item) => <article className="vocab-card" key={item.word}><button className={`save-sign ${saved.includes(item.word) ? "saved" : ""}`} aria-label={`${saved.includes(item.word) ? "Unsave" : "Save"} ${item.word}`} onClick={() => setSaved((current) => current.includes(item.word) ? current.filter((word) => word !== item.word) : [...current, item.word])}>{saved.includes(item.word) ? "♥" : "♡"}</button><div className="vocab-emoji">{item.emoji}</div><span className="category-tag">{item.category}</span><h2>{item.word}</h2><p>{item.meaning}</p><small>{item.hint}</small><button className="vocab-practice" onClick={() => window.speechSynthesis?.speak(new SpeechSynthesisUtterance(item.word))}>🔊 Hear the word</button></article>)}</div> : <div className="empty-state"><span>🔎</span><h2>No signs found</h2><p>Try a different search or category.</p></div>}
  </>;
}

function Practice({ onToast }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [selected, setSelected] = useState("Salamat");
  const [checked, setChecked] = useState(false);
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
    try {
      await api("/progress/complete", { method: "POST", body: JSON.stringify({ activity: "sign-practice", score: 0 }) });
      setChecked(true);
      onToast("Nice work! Your practice has been noted.");
    } catch (error) {
      onToast(`Your practice couldn't be saved: ${error.message}`);
    }
  };
  return <>
    <PageTitle eyebrow="PRACTICE MAKES CONNECTION" title="Sign practice" description="Take a breath, get comfortable, and practice a sign at your own pace." />
    <div className="practice-layout"><section className="camera-panel"><div className="camera-top"><div><p className="eyebrow">YOUR PRACTICE SPACE</p><h2>Ready when you are</h2></div><span className={`camera-state ${cameraOn ? "camera-live" : ""}`}><i />{cameraOn ? "Camera on" : "Camera off"}</span></div><div className={`camera-view ${cameraOn ? "camera-active" : ""}`}>{cameraOn ? <video ref={videoRef} autoPlay muted playsInline /> : <><div className="camera-frame"><span /><span /><span /><span /></div><div className="camera-placeholder"><div className="camera-icon">✋</div><strong>Make yourself comfy</strong><p>Your camera preview will appear here.<br />Nothing is recorded or saved.</p><Button variant="outline" onClick={toggleCamera}>Turn on camera</Button></div></>}</div><div className="camera-controls"><Button variant={cameraOn ? "outline" : "primary"} onClick={toggleCamera}>{cameraOn ? "Turn camera off" : "Enable camera"} <span>⌕</span></Button><span>🔒 Your video stays on your device</span></div></section><aside className="sign-guide panel"><p className="eyebrow">TODAY'S SIGN</p><h2>“{selected}”</h2><p className="guide-meaning">{selected === "Salamat" ? "Thank you" : selected === "Kumusta" ? "Hello / How are you?" : "Goodbye"} <span>·</span> Filipino</p><div className="hand-guide"><span>✋</span><div className="guide-play">▶</div></div><h3>Try it step by step</h3><ol><li><span>1</span> Relax your shoulders and take a breath.</li><li><span>2</span> Watch a trusted FSL demonstration of the sign.</li><li><span>3</span> Try it slowly in your own practice space.</li></ol><div className="guide-note"><span>💡</span><p>Signs can vary by region and community. Learn from Deaf FSL signers whenever you can.</p></div><label className="select-label">Choose another sign<select value={selected} onChange={(event) => { setSelected(event.target.value); setChecked(false); }}><option>Salamat</option><option>Kumusta</option><option>Paalam</option></select></label></aside></div><section className="practice-check"><div><span className="check-star">✦</span><div><strong>How did that feel?</strong><small>Take a moment to reflect. Every try counts!</small></div></div><div><Button variant={checked ? "outline" : "primary"} onClick={markPractice}>{checked ? "✓ Practice noted" : "I practiced this sign"}</Button></div></section>
  </>;
}

function Scenarios({ onNavigate }) {
  return <>
    <PageTitle eyebrow="LEARN BY LIVING IT" title="Choose a scenario" description="Practice useful signs in everyday moments. Pick a story and see where the conversation takes you." />
    <div className="scenario-banner"><span>💬</span><div><strong>Real moments, real connection</strong><p>Each scenario is a safe space to try, make mistakes, and grow your confidence.</p></div><span className="scenario-count">3 stories <b>·</b> 5–10 min each</span></div>
    <div className="scenario-grid">{scenarios.map((scenario) => <article className="scenario-card" key={scenario.title}><div className={`scenario-art ${scenario.color}`}><span>{scenario.emoji}</span><small>{scenario.tag}</small></div><div className="scenario-content"><span className="eyebrow">{scenario.tag.toUpperCase()} SCENARIO</span><h2>{scenario.title}</h2><p>{scenario.description}</p><div className="scenario-bottom"><span>⏱ 5–10 min <i>·</i> Beginner friendly</span><Button variant="outline" onClick={() => onNavigate("/activity")}>Start story <span>→</span></Button></div></div></article>)}</div>
    <div className="gentle-note"><span>🌱</span><span>There's no pressure to get it perfect. This is your space to explore.</span></div>
  </>;
}

function ScenarioActivity({ onNavigate, onToast }) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const options = ["Kumusta", "Salamat", "Paalam"];
  const submit = async () => {
    if (!answer) return onToast("Choose a sign before continuing.");
    if (!submitted) {
      setSubmitted(true);
      try {
        await api("/progress/complete", { method: "POST", body: JSON.stringify({ activity: "scenario-store", score: answer === "Kumusta" ? 100 : 60 }) });
      } catch (error) {
        onToast(`Your answer was checked, but progress could not sync: ${error.message}`);
      }
    } else onNavigate("/results");
  };
  return <><div className="activity-top"><button className="back-link" onClick={() => onNavigate("/scenarios")}>← All scenarios</button><span>STORY 1 OF 3</span><span>1 / 3</span></div><div className="activity-progress"><ProgressBar value={34} /></div><section className="activity-card panel"><div className="activity-art peach">🏪<span>✦</span></div><span className="eyebrow">AT THE SARI-SARI STORE</span><h1>A friendly hello</h1><p className="activity-prompt">You walk into your neighborhood store. The shopkeeper smiles and waves. How would you greet them?</p><div className="choice-grid">{options.map((option) => <button className={`choice-card ${answer === option ? "choice-selected" : ""} ${submitted && option === "Kumusta" ? "choice-correct" : ""}`} key={option} onClick={() => !submitted && setAnswer(option)}><span className="choice-emoji">{option === "Kumusta" ? "👋" : option === "Salamat" ? "💛" : "🌤️"}</span><span><strong>{option}</strong><small>{option === "Kumusta" ? "Hello / How are you?" : option === "Salamat" ? "Thank you" : "Goodbye"}</small></span><span className="choice-radio">{submitted && option === "Kumusta" ? "✓" : ""}</span></button>)}</div>{submitted && <div className="answer-feedback"><span>🌟</span><div><strong>Lovely choice!</strong><p>“Kumusta” is a friendly way to start a conversation. Nice work!</p></div></div>}<div className="activity-actions"><button className="text-link" onClick={() => onToast("Hint: think of a friendly greeting to start your conversation.")}>Need a hint?</button><Button onClick={submit}>{submitted ? "Continue story" : "Check my answer"} <span>→</span></Button></div></section></>;
}

function ActivityResults({ onNavigate }) {
  return <section className="result-card panel"><div className="result-confetti">✦　✿　✦</div><span className="result-icon">🌟</span><p className="eyebrow">SCENARIO COMPLETE</p><h1>You made a connection!</h1><p>Every conversation starts somewhere. You showed up and gave it a try — that's something to be proud of.</p><div className="result-stats"><div><strong>3/3</strong><small>moments explored</small></div><div><strong>+25</strong><small>kindness points</small></div><div><strong>1</strong><small>new sign practiced</small></div></div><div className="result-actions"><Button onClick={() => onNavigate("/scenarios")}>Choose another story <span>→</span></Button><button className="text-link" onClick={() => onNavigate("/progress")}>See my progress</button></div></section>;
}

function Challenge({ onNavigate, onToast }) {
  const [selected, setSelected] = useState("");
  const [question, setQuestion] = useState(0);
  const words = ["Salamat", "Kumusta", "Kaibigan"];
  return <><PageTitle eyebrow="A NEW CHAPTER IS WAITING" title="Level unlock challenge" description="A few familiar signs, one little challenge. Take it at your own pace — you can always try again." /><section className="challenge-panel panel"><div className="challenge-top"><span className="challenge-badge">✦</span><span>EXPLORER LEVEL <b>→</b> TRAILBLAZER</span><span>{question + 1} of 3</span></div><ProgressBar value={(question + 1) * 33} color="peach" /><div className="challenge-question"><div className="challenge-emoji">{question === 0 ? "👋" : question === 1 ? "💛" : "🧑‍🤝‍🧑"}</div><p className="eyebrow">WHICH WORD MATCHES THIS SIGN?</p><h2>{question === 0 ? "A warm greeting to start a conversation" : question === 1 ? "A little word that shows gratitude" : "Someone you enjoy spending time with"}</h2><div className="challenge-options">{["Kumusta", "Salamat", "Kaibigan"].map((word) => <button className={`challenge-option ${selected === word ? "challenge-selected" : ""}`} key={word} onClick={() => setSelected(word)}>{word}<span>{selected === word ? "●" : "○"}</span></button>)}</div><Button onClick={() => { if (!selected) return onToast("Pick an answer to continue."); if (selected === words[question]) { if (question === 2) onNavigate("/challenge/success"); else { setQuestion(question + 1); setSelected(""); } } else onNavigate("/challenge/try-again"); }}>Check answer <span>→</span></Button></div><p className="challenge-footnote">Take a breath. Learning isn't a race. <button onClick={() => onNavigate("/")}>Come back later</button></p></section></>;
}

function ChallengeFeedback({ success = false, onNavigate }) {
  return <section className={`feedback-card panel ${success ? "feedback-success" : "feedback-retry"}`}><span className="feedback-icon">{success ? "🏆" : "🌱"}</span><p className="eyebrow">{success ? "A NEW LEVEL IS YOURS" : "EVERY TRY IS PROGRESS"}</p><h1>{success ? "You're a Trailblazer!" : "You're learning as you go."}</h1><p>{success ? "You made it through the challenge. Keep exploring, keep connecting, and keep being you." : "Some signs take a little more practice. That's completely okay. Take a breath and give it another go when you're ready."}</p>{success && <div className="unlocked-level"><span>✦</span><div><small>NEW LEVEL UNLOCKED</small><strong>Trailblazer</strong></div><span>🌟</span></div>}<div className="result-actions"><Button onClick={() => onNavigate(success ? "/paths" : "/challenge")}>{success ? "Explore new lessons" : "Try the challenge again"} <span>→</span></Button><button className="text-link" onClick={() => onNavigate("/")}>Back to my dashboard</button></div></section>;
}

function Progress() {
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    Promise.all([api("/dashboard"), api("/progress")])
      .then(([dashboardData, progressData]) => { setSummary(dashboardData); setEvents(progressData.events); })
      .catch((error) => setLoadError(error.message));
  }, []);
  return <><PageTitle eyebrow="LOOK HOW FAR YOU'VE COME" title="My progress" description="Every practice session counts. Here's a little snapshot of your learning journey." action={<Button variant="outline" onClick={() => window.print()}>↓ Save my progress</Button>} />{loadError && <p className="inline-error">Could not refresh your progress: {loadError}</p>}<div className="progress-overview"><StatCard icon="🌱" tone="mint" label="Current level" value="Explorer" change="2 of 4 levels" /><StatCard icon="📖" tone="lavender" label="Lessons done" value={`${summary?.lessons_completed ?? 12} / 28`} change="Keep it up!" /><StatCard icon="🔥" tone="yellow" label="Best streak" value="9 days" change="Current: 6 days" /><StatCard icon="🌟" tone="peach" label="Practice activities" value={summary ? events.length : 3} change="Saved to your profile" /></div><div className="progress-content-grid"><section className="panel progress-chart-panel"><div className="panel-heading"><div><p className="eyebrow">SHOWING UP IS EVERYTHING</p><h2>Your learning rhythm</h2></div><select className="select-compact" aria-label="Chart period"><option>This week</option><option>This month</option></select></div><div className="large-chart">{[30,60,45,90,52,75,22].map((value,index)=><div key={index}><span className="large-chart-bar" style={{height:`${value}%`}}/><small>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][index]}</small></div>)}</div><p className="chart-caption">You've practiced on 4 days this week. Just one more to reach your goal! ✨</p></section><section className="panel level-panel"><p className="eyebrow">YOUR LEARNING PATH</p><h2>Growing at your pace</h2><div className="level-steps"><div className="level-step complete"><span>✓</span><div><strong>Seedling</strong><small>Completed · 120 points</small></div></div><div className="level-step current"><span>✦</span><div><strong>Explorer</strong><small>340 / 400 points</small><ProgressBar value={85} /></div></div><div className="level-step"><span>3</span><div><strong>Trailblazer</strong><small>Unlock at 400 points</small></div></div><div className="level-step"><span>4</span><div><strong>Community star</strong><small>There's more to discover</small></div></div></div></section></div><section className="panel achievement-list"><div className="panel-heading"><div><p className="eyebrow">MILESTONES TO CELEBRATE</p><h2>Your badges</h2></div><span className="soft-tag">3 earned</span></div><div className="badge-list"><div><span>🌅</span><strong>Early bird</strong><small>Learned before 9 am</small></div><div><span>🔥</span><strong>On a roll</strong><small>Practiced 5 days in a row</small></div><div><span>💛</span><strong>Kind communicator</strong><small>Learned 10 everyday signs</small></div><div className="badge-locked"><span>🦋</span><strong>Sign explorer</strong><small>Learn 20 new signs</small></div></div></section></>;
}

function InstructorDashboard({ onNavigate }) {
  return <><PageTitle eyebrow="YOUR CLASSROOM, AT A GLANCE" title="Good morning, Jamie! ☀️" description="A little encouragement goes a long way. Here's how your learners are doing this week." action={<Button onClick={() => onNavigate("/classrooms/create")}>＋ New classroom</Button>} /><div className="stats-grid instructor-stats"><StatCard icon="♧" tone="lavender" label="Active learners" value="24" change="+3 this month" /><StatCard icon="📚" tone="mint" label="Lessons completed" value="186" change="+12 this week" /><StatCard icon="✋" tone="peach" label="Signs practiced" value="842" change="Across all learners" /><StatCard icon="🌟" tone="yellow" label="Class engagement" value="87%" change="↑ 8% from last week" /></div><div className="instructor-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">YOUR PEOPLE</p><h2>Learner snapshots</h2></div><button className="text-link" onClick={() => onNavigate("/learners")}>All learners →</button></div><LearnerTable rows={learners.slice(0, 3)} onNavigate={onNavigate} /></section><section className="panel classroom-summary"><div className="panel-heading"><div><p className="eyebrow">LEARN TOGETHER</p><h2>Virtual classrooms</h2></div></div><div className="classroom-feature"><span>🏡</span><div><strong>Sunshine Sign Stars</strong><small>12 learners · created Sep 8</small></div><span className="room-status">ACTIVE</span></div><div className="classroom-feature"><span>🌈</span><div><strong>Little Language Club</strong><small>8 learners · created Aug 22</small></div><span className="room-status">ACTIVE</span></div><Button variant="outline" className="full-button" onClick={() => onNavigate("/classrooms")}>Manage classrooms <span>→</span></Button></section><section className="panel instructor-activity"><div className="panel-heading"><div><p className="eyebrow">YOUR CLASS AT A GLANCE</p><h2>Weekly activity</h2></div><select className="select-compact" aria-label="Activity time period"><option>This week</option><option>This month</option></select></div><div className="large-chart">{[48,65,41,90,58,77,32].map((value,index)=><div key={index}><span className="large-chart-bar" style={{height:`${value}%`}}/><small>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][index]}</small></div>)}</div></section><section className="tip-card"><span>💡</span><p className="eyebrow">A GENTLE REMINDER</p><h2>Celebrate the effort, not just the answer.</h2><p>Every attempt is a brave step toward better communication. Your encouragement matters.</p><button className="text-link" onClick={() => onNavigate("/help")}>More teaching tips →</button></section></div></>;
}

function LearnerTable({ rows, onNavigate }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>LEARNER</th><th>LEVEL</th><th>LESSONS</th><th>ACCURACY</th><th>STREAK</th><th /></tr></thead><tbody>{rows.map((learner) => <tr key={learner.id}><td><button className="learner-name" onClick={() => onNavigate(`/learners/${learner.id}`)}><span className={`avatar avatar-${learner.color}`}>{learner.initials}</span><span><strong>{learner.name}</strong><small>Last active today</small></span></button></td><td><span className="soft-tag">{learner.level}</span></td><td>{learner.lessons}</td><td><div className="table-progress">{learner.accuracy}%<ProgressBar value={learner.accuracy} /></div></td><td>🔥 {learner.streak} days</td><td><button className="more-button" onClick={() => onNavigate(`/learners/${learner.id}`)} aria-label={`View ${learner.name}`}>···</button></td></tr>)}</tbody></table></div>;
}

function LearnerManagement({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [roster, setRoster] = useState(learners);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    api("/instructor/learners").then((result) => setRoster(result.learners)).catch((error) => setLoadError(error.message));
  }, []);
  const filtered = roster.filter((learner) => learner.name.toLowerCase().includes(search.toLowerCase()));
  return <>  <PageTitle eyebrow="HELP EVERY LEARNER SHINE" title="Learner management" description="Get to know your learners' progress, celebrate their wins, and find where they might need a hand." action={<Button onClick={() => onNavigate("/classrooms")}>＋ Add learners</Button>} /><section className="panel learner-management-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR LEARNERS</p><h2>{roster.length} learners</h2></div><label className="search-field compact-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a learner" /></label></div>{loadError && <p className="inline-error">Could not load learners: {loadError}</p>}<LearnerTable rows={filtered} onNavigate={onNavigate} />{filtered.length === 0 && <div className="empty-table">No learners match that name yet.</div>}<div className="table-footer"><span>Showing {filtered.length} of {roster.length} learners</span><div><button disabled>← Previous</button><button className="page-number">1</button><button>2</button><button>3</button><button>Next →</button></div></div></section><div className="gentle-note"><span>💛</span><span>Learner information is private to your classroom. Please handle it with care.</span></div></>;
}

function LearnerDetails() {
  const { id } = useParams();
  const learnerId = Number(id);
  const learner = learners.find((person) => person.id === learnerId) || learners[0];
  return <><PageTitle eyebrow="LEARNER PROFILE" title={learner.name} description={`A closer look at ${learner.name.split(" ")[0]}'s learning journey.`} action={<span className="soft-tag">● Active today</span>} /><div className="learner-detail-hero panel"><span className={`avatar avatar-large avatar-${learner.color}`}>{learner.initials}</span><div><h2>{learner.name}</h2><p>Age {learner.age} · {learner.level} level · Sunshine Sign Stars</p></div><Button variant="outline" onClick={() => window.print()}>↓ Export summary</Button></div><div className="stats-grid"><StatCard icon="📚" tone="lavender" label="Lessons completed" value={learner.lessons} change="Since joining" /><StatCard icon="✋" tone="peach" label="Sign accuracy" value={`${learner.accuracy}%`} change="Across recent practice" /><StatCard icon="🔥" tone="yellow" label="Current streak" value={`${learner.streak} days`} change="Best: 9 days" /><StatCard icon="🌱" tone="mint" label="Current level" value={learner.level} change="Making steady progress" /></div><div className="progress-content-grid"><section className="panel"><p className="eyebrow">GROWING EVERY WEEK</p><h2>Recent activity</h2><div className="timeline"><div><i className="timeline-dot mint" /><span><strong>Completed “Greetings & introductions”</strong><small>Today · 8 min · 92% practice confidence</small></span></div><div><i className="timeline-dot peach" /><span><strong>Practiced 6 new vocabulary signs</strong><small>Yesterday · FSL Foundations</small></span></div><div><i className="timeline-dot lavender" /><span><strong>Earned the “Early bird” badge</strong><small>Monday · 8:42 am</small></span></div></div></section><section className="panel"><p className="eyebrow">A LITTLE ENCOURAGEMENT</p><h2>Strengths & next steps</h2><div className="insight-row"><span>🌟</span><div><strong>Strong with greetings</strong><small>Consistent practice and growing confidence.</small></div></div><div className="insight-row"><span>🌱</span><div><strong>Ready for everyday signs</strong><small>Try the next vocabulary set together.</small></div></div><Button variant="outline" className="full-button">Send a kind note</Button></section></div></>;
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
          <div className={`classroom-icon ${index % 2 === 0 ? "mint" : "lavender"}`}>{index % 2 === 0 ? "🏡" : "🌈"}</div>
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
    {classrooms.length === 0 && !loadError && <div className="empty-state"><span>🏡</span><h2>No classrooms yet</h2><p>Create a classroom to invite learners into your space.</p></div>}
    <section className="invite-panel"><div><span>✉️</span><h2>Invite learners into your classroom</h2><p>Share your classroom code with families. Learners can join when they're ready.</p></div><Button variant="outline" onClick={() => onNavigate("/classrooms/create")}>Create a classroom</Button></section>
  </>;
}

function AddStudents({ onNavigate, onToast }) {
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
  return <><PageTitle eyebrow="GROW YOUR LEARNING COMMUNITY" title="Add students" description="Invite a learner to this classroom. Their contact details stay within your local demo." action={<Button variant="outline" onClick={() => onNavigate("/classrooms")}>← Classrooms</Button>} /><section className="classroom-detail-banner panel"><span>🏡</span><div><small>CLASSROOM</small><h2>{classroom?.name || "Your classroom"}</h2><p>Class code <strong>{classroom?.code || "…"}</strong></p></div></section><div className="students-layout"><form className="form-panel panel" onSubmit={submit}><p className="eyebrow">PERSONAL INVITE</p><h2>Add a learner</h2><p className="form-description">Add a name and email address to your classroom roster.</p><label>Learner name<input required maxLength={70} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sam Rivera" /></label><label>Family or learner email<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><div className="form-actions"><Button type="submit" disabled={loading}>{loading ? "Adding…" : "Add to classroom"} <span>→</span></Button></div></form><section className="panel roster-panel"><div className="panel-heading"><div><p className="eyebrow">LEARNING TOGETHER</p><h2>{students.length} learner{students.length === 1 ? "" : "s"}</h2></div><span className="soft-tag">PRIVATE ROSTER</span></div>{loadError && <p className="inline-error">Could not load roster: {loadError}</p>}{students.length ? students.map((student) => <div className="roster-row" key={student.id}><span className="avatar avatar-mint">{student.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{student.name}</strong><small>{student.email}</small></span><span className="room-status">INVITED</span></div>) : <div className="empty-state"><span>🌱</span><h2>A new beginning</h2><p>Your learners will appear here once added.</p></div>}</section></div></>;
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
  return <><PageTitle eyebrow="A SPACE TO LEARN TOGETHER" title="Create a classroom" description="Start a welcoming space where your learners can practice and grow together." /><form className="form-panel panel" onSubmit={submit}><div className="form-icon">🏡</div><label>Classroom name<input required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sunshine Sign Stars" /></label><label>A little about your class <span className="optional">(optional)</span><textarea rows="4" maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you learning together?" /></label><div className="form-note"><span>🔒</span><span>A unique invite code will be created for you. Only people with your code can request to join.</span></div><div className="form-actions"><button type="button" className="text-link" onClick={() => onNavigate("/classrooms")}>Cancel</button><Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create classroom"} <span>→</span></Button></div></form></>;
}

    function Profile({ user, onSave }) {
      const [name, setName] = useState(user.name);
      const [age, setAge] = useState(user.learner_type);
      const [goal, setGoal] = useState(user.learning_goal);
      return <><PageTitle eyebrow="THIS IS YOUR SPACE" title="My profile" description="Make your learning space feel a little more like you." /><form className="profile-form panel" onSubmit={(event) => { event.preventDefault(); onSave({ name: name.trim() || user.name, learner_type: age, learning_goal: goal }); }}><div className="profile-edit-head"><span className="avatar avatar-large avatar-mint">{name.split(" ").map((part) => part[0]).slice(0, 2).join("") || "AR"}</span><div><h2>{name || "Your name"}</h2><p>Explorer · Joined this year</p></div><button type="button" className="button button-outline" onClick={() => document.getElementById("profile-name")?.focus()}>Edit details</button></div><div className="profile-fields"><label>Display name<input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={70} /></label><label>Email address<input type="email" value={user.email || ""} readOnly /></label><label>Learning as<select value={age} onChange={(event) => setAge(event.target.value)}><option>Adult learner</option><option>Child learner</option><option>Parent or caregiver</option><option>Educator</option></select></label><label>My learning goal<select value={goal} onChange={(event) => setGoal(event.target.value)}><option>Everyday conversations</option><option>Connect with family</option><option>Learn for my classroom</option><option>Explore Filipino culture</option></select></label></div><div className="form-actions"><Link className="text-link" to="/settings">Account settings →</Link><Button type="submit">Save changes</Button></div></form></>;
    }

    function Settings({ onToast }) {
      const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem("talinturo-settings");
        return saved ? JSON.parse(saved) : { reminders: true, sound: true, reducedMotion: false, weekly: false };
      });
      const toggle = (key) => {
        const next = { ...settings, [key]: !settings[key] };
        setSettings(next);
        localStorage.setItem("talinturo-settings", JSON.stringify(next));
      };
      return <><PageTitle eyebrow="MAKE IT YOUR OWN" title="Settings" description="A few little choices to make learning feel just right for you." /><div className="settings-layout"><section className="panel settings-panel"><p className="eyebrow">YOUR EXPERIENCE</p><h2>Learning preferences</h2><SettingRow title="Gentle practice reminders" text="A friendly nudge to help you keep your learning streak." checked={settings.reminders} onChange={() => toggle("reminders")} /><SettingRow title="Sound effects" text="Play a little sound when you finish an activity." checked={settings.sound} onChange={() => toggle("sound")} /><SettingRow title="Reduce motion" text="Use fewer animations throughout the app." checked={settings.reducedMotion} onChange={() => toggle("reducedMotion")} /></section><section className="panel settings-panel"><p className="eyebrow">KEEP IN THE LOOP</p><h2>Email updates</h2><SettingRow title="Weekly learning summary" text="A quick recap of your progress and little wins." checked={settings.weekly} onChange={() => toggle("weekly")} /><div className="setting-danger"><div><strong>Need a fresh start?</strong><small>Reset your local practice activity. Your account stays safe.</small></div><button onClick={() => onToast("Progress reset is not available in this demo.")}>Reset practice data</button></div></section><div className="settings-footer"><span>Preferences are saved on this device.</span><button className="button button-outline" onClick={() => { localStorage.setItem("talinturo-settings", JSON.stringify(settings)); onToast("Your preferences have been saved."); }}>Save preferences</button></div></div></>;
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
      return <><PageTitle eyebrow="WE'RE HERE FOR YOU" title="Help & about" description="Questions are part of learning. Find a few answers and helpful notes below." /><section className="help-intro"><span>🌼</span><div><h2>Learning with respect, always.</h2><p>Talinturo is a small step toward making FSL learning more welcoming and accessible. FSL is a living language, and the Filipino Deaf community is its heart. We encourage learning directly from Deaf signers and educators.</p></div></section><section className="panel faq-panel"><p className="eyebrow">A FEW COMMON QUESTIONS</p><h2>How can we help?</h2>{questions.map(([question, answer], index) => <div className={`faq-item ${open === index ? "faq-open" : ""}`} key={question}><button onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}><strong>{question}</strong><span>{open === index ? "−" : "+"}</span></button>{open === index && <p>{answer}</p>}</div>)}</section><p className="help-contact">Still have questions? <a href="mailto:hello@talinturo.example">Say hello to our team</a>.</p></>;
    }

    function AuthPage({ mode, onAuth, onToast }) {
      const [email, setEmail] = useState("");
      const [password, setPassword] = useState("");
      const [name, setName] = useState("");
      const [loading, setLoading] = useState(false);
      const isSignup = mode === "signup";
      const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
          const result = await api(`/auth/${isSignup ? "signup" : "login"}`, { method: "POST", body: JSON.stringify({ email, password, name }) });
          onAuth(result.user);
        } catch (error) {
          onToast(`Couldn't ${isSignup ? "create your account" : "sign in"}: ${error.message}`);
        } finally {
          setLoading(false);
        }
      };
      return <div className="auth-page"><section className="auth-card panel"><Link to="/" className="auth-brand"><span className="brand-mark">t<span>✳</span></span><strong>talinturo</strong></Link><span className="auth-flower">🌼</span><p className="eyebrow">{isSignup ? "YOUR FSL JOURNEY STARTS HERE" : "WELCOME BACK"}</p><h1>{isSignup ? "Let's make a little progress." : "It's nice to see you."}</h1><p className="auth-description">{isSignup ? "Create your learning space. Go at your pace, and celebrate every sign." : "Sign in and keep your learning journey going."}</p><form onSubmit={submit}>{isSignup && <label>Your name<input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" placeholder="How should we call you?" /></label>}<label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="you@example.com" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={isSignup ? "new-password" : "current-password"} placeholder="At least 8 characters" /></label>{!isSignup && <Link className="forgot-link" to="/forgot-password">Forgot password?</Link>}<Button className="full-button" type="submit" disabled={loading}>{loading ? "One moment…" : isSignup ? "Create my account" : "Sign in"} <span>→</span></Button></form><div className="auth-divider"><span>or</span></div><Button variant="outline" className="full-button" onClick={() => onToast("OAuth sign-in is a deployment integration and isn't configured in this demo.")}>◎ Continue with Google</Button><p className="auth-switch">{isSignup ? "Already learning with us?" : "New to Talinturo?"} <Link to={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link></p><p className="auth-oauth-note">Social sign-in requires a configured OAuth provider.</p></section><aside className="auth-side"><div className="auth-side-art"><span>👋</span><i>✦</i><b>✿</b></div><h2>Small signs.<br />Big connections.</h2><p>Build a more inclusive world, one kind conversation at a time.</p><span className="auth-side-caption">MADE FOR LEARNERS, FAMILIES & EDUCATORS</span></aside></div>;
    }

    function ForgotPassword({ onToast }) {
      const [email, setEmail] = useState("");
      const [sent, setSent] = useState(false);
      return <div className="auth-page"><section className="auth-card panel"><Link to="/" className="auth-brand"><span className="brand-mark">t<span>✳</span></span><strong>talinturo</strong></Link><span className="auth-flower">✉️</span><p className="eyebrow">A FRESH START</p><h1>{sent ? "Password reset isn't connected yet." : "Forgot your password?"}</h1><p className="auth-description">{sent ? "This local demo has no email delivery configured. Contact your administrator to reset your account." : "It happens! Enter your email to check the reset flow. Email delivery needs to be configured before a link can be sent."}</p>{sent ? <Button className="full-button" onClick={() => window.location.assign("/login")}>Back to sign in</Button> : <form onSubmit={(event) => { event.preventDefault(); setSent(true); }}><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><Button className="full-button" type="submit">Continue <span>→</span></Button></form>}<p className="auth-switch"><Link to="/login">← Back to sign in</Link></p></section><aside className="auth-side"><div className="auth-side-art"><span>🌱</span><i>✦</i><b>✿</b></div><h2>One little step<br />at a time.</h2><p>Your learning journey will be right here when you return.</p><span className="auth-side-caption">MADE FOR LEARNERS, FAMILIES & EDUCATORS</span></aside></div>;
    }

    function ResetPassword() {
      return <section className="not-found panel"><span>🔐</span><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Password reset isn't configured.</h1><p>This local demo has no email delivery or reset-token service. Ask your administrator for help, or return to sign in.</p><Link className="button button-primary" to="/login">Back to sign in <span>→</span></Link></section>;
    }

    function WelcomePage() {
      return <section className="landing-page"><span className="welcome-label"><span>✦</span> WELCOME TO TALINTURO</span><h1>Small signs.<br /><span>Big connections.</span></h1><p>A welcoming place to explore Filipino Sign Language. Learn at your own pace, practice everyday moments, and celebrate every little win.</p><div className="landing-art" aria-hidden="true"><span>👋</span><i>✦</i><b>🌱</b></div><div className="landing-actions"><Link className="button button-primary" to="/signup">Start learning <span>→</span></Link><Link className="button button-outline" to="/login">I have an account</Link></div><small>Made for learners, families & educators</small></section>;
    }

    function ProfileSetup({ onDone }) {
      const [goal, setGoal] = useState("Connect with family");
      return <div className="auth-page"><section className="auth-card panel"><Link to="/" className="auth-brand"><span className="brand-mark">t<span>✳</span></span><strong>talinturo</strong></Link><span className="auth-flower">🌱</span><p className="eyebrow">LET'S MAKE THIS YOURS</p><h1>What brings you here?</h1><p className="auth-description">We'll use this to make your learning journey feel a little more personal.</p><form onSubmit={(event) => { event.preventDefault(); onDone(); }}><label>My learning goal<select value={goal} onChange={(event) => setGoal(event.target.value)}><option>Connect with family</option><option>Everyday conversations</option><option>Learn for my classroom</option><option>Explore Filipino culture</option></select></label><label>I'm learning as<select defaultValue="Adult learner"><option>Adult learner</option><option>Child learner</option><option>Parent or caregiver</option><option>Educator</option></select></label><Button className="full-button" type="submit">Let's get started <span>→</span></Button></form><button className="skip-setup" onClick={onDone}>I'll do this later</button></section><aside className="auth-side"><div className="auth-side-art"><span>🌈</span><i>✦</i><b>✿</b></div><h2>Your story.<br />Your pace.</h2><p>There is no one way to learn. We'll meet you right where you are.</p><span className="auth-side-caption">MADE FOR LEARNERS, FAMILIES & EDUCATORS</span></aside></div>;
    }

    function NotFound({ onNavigate }) {
      return <section className="not-found panel"><span>🧭</span><p className="eyebrow">A LITTLE DETOUR</p><h1>We can't find that page.</h1><p>Looks like this path has changed. Let's find another way together.</p><Button onClick={() => onNavigate("/")}>Back to my dashboard <span>→</span></Button></section>;
    }

export default App;
