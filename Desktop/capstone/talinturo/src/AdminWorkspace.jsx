import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const emptyOverview = {
  learners: 0, instructors: 0, active_accounts: 0, paths: 0,
  published_paths: 0, lessons: 0, published_lessons: 0, classrooms: 0,
};

function Metric({ label, value, detail, icon }) {
  return <article className="admin-metric"><span className="admin-metric-icon">{icon}</span><div><small>{label}</small><strong>{value ?? "—"}</strong><span>{detail}</span></div></article>;
}

export default function AdminWorkspace({ user }) {
  const [section, setSection] = useState("overview");
  const [overview, setOverview] = useState(emptyOverview);
  const [accounts, setAccounts] = useState([]);
  const [paths, setPaths] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState({ name: "", email: "", password: "", role: "learner" });
  const [pathForm, setPathForm] = useState({ title: "", description: "", level: "Beginner" });
  const [lessonForm, setLessonForm] = useState({
    path_id: "", title: "", description: "", duration_minutes: 5,
    content: '{\n  "sections": [\n    { "title": "Introduction", "body": "Add your lesson material here." }\n  ]\n}',
  });

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summary, accountData, content] = await Promise.all([
        api("/admin/overview"), api("/admin/accounts"), api("/admin/content"),
      ]);
      setOverview(summary.overview);
      setAccounts(accountData.accounts);
      setPaths(content.paths);
      setLessons(content.lessons);
      setLessonForm((current) => ({ ...current, path_id: current.path_id || String(content.paths[0]?.id || "") }));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const lessonsByPath = useMemo(() => lessons.reduce((groups, lesson) => {
    (groups[lesson.path_id] ||= []).push(lesson);
    return groups;
  }, {}), [lessons]);

  const save = async (task, successMessage) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await task();
      setNotice(successMessage);
      await reload();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const createAccount = async (event) => {
    event.preventDefault();
    await save(async () => {
      await api("/admin/accounts", { method: "POST", body: JSON.stringify(account) });
      setAccount({ name: "", email: "", password: "", role: "learner" });
    }, `${account.role === "instructor" ? "Instructor" : "Learner"} account created.`);
  };

  const createPath = async (event) => {
    event.preventDefault();
    await save(async () => {
      await api("/admin/paths", { method: "POST", body: JSON.stringify(pathForm) });
      setPathForm({ title: "", description: "", level: "Beginner" });
    }, "Learning path saved as a draft.");
  };

  const createLesson = async (event) => {
    event.preventDefault();
    let content;
    try { content = JSON.parse(lessonForm.content); }
    catch { setError("Lesson material must be valid JSON."); return; }
    await save(async () => {
      await api(`/admin/paths/${lessonForm.path_id}/lessons`, {
        method: "POST",
        body: JSON.stringify({ ...lessonForm, duration_minutes: Number(lessonForm.duration_minutes), content }),
      });
      setLessonForm((current) => ({ ...current, title: "", description: "" }));
    }, "Lesson saved as a draft.");
  };

  const toggleAccount = (item) => save(
    () => api(`/admin/accounts/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }) }),
    `${item.name}'s account is now ${item.is_active ? "inactive" : "active"}.`,
  );

  const togglePath = (path) => save(
    () => api(`/admin/paths/${path.id}`, { method: "PATCH", body: JSON.stringify({ is_published: !path.is_published }) }),
    `“${path.title}” is now ${path.is_published ? "a draft" : "published"}.`,
  );

  const toggleLesson = (lesson) => save(
    () => api(`/admin/lessons/${lesson.id}`, { method: "PATCH", body: JSON.stringify({ is_published: !lesson.is_published }) }),
    `“${lesson.title}” is now ${lesson.is_published ? "a draft" : "published"}.`,
  );

  return <div className="admin-workspace">
    <section className="admin-hero">
      <div><p className="eyebrow">TALINTURO ADMINISTRATION</p><h1>Good day, {user.name.split(" ")[0]}.</h1><p>Keep learning spaces welcoming, accounts supported, and FSL content ready to explore.</p></div>
      <div className="admin-hero-mark" aria-hidden="true"><span>✳</span><b>FSL<br />LEARNING</b></div>
    </section>

    <nav className="admin-tabs" aria-label="Admin sections">
      {[ ["overview", "Overview"], ["accounts", "Accounts"], ["content", "Learning content"] ].map(([key, label]) => <button type="button" key={key} className={section === key ? "admin-tab active" : "admin-tab"} onClick={() => setSection(key)}>{label}</button>)}
    </nav>
    {error && <p className="admin-alert" role="alert">{error}</p>}
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {loading ? <div className="admin-empty">Loading your workspace…</div> : <>
      {section === "overview" && <>
        <div className="admin-metrics">
          <Metric label="Learners" value={overview.learners} detail="Learner accounts" icon="✳" />
          <Metric label="Instructors" value={overview.instructors} detail="Teaching accounts" icon="↗" />
          <Metric label="Published paths" value={`${overview.published_paths} / ${overview.paths}`} detail="Available learning journeys" icon="▤" />
          <Metric label="Published lessons" value={`${overview.published_lessons} / ${overview.lessons}`} detail="Ready for learners" icon="◷" />
        </div>
        <div className="admin-overview-grid">
          <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">CONTENT LIBRARY</p><h2>Learning paths</h2></div><button className="admin-text-button" onClick={() => setSection("content")}>Manage content →</button></div>
            {paths.length ? paths.slice(0, 5).map((path) => <div className="admin-list-row" key={path.id}><span className="admin-row-icon">▤</span><div className="admin-row-copy"><strong>{path.title}</strong><small>{path.level || "Uncategorized"} · {path.lesson_count} lessons</small></div><span className={`admin-status ${path.is_published ? "published" : "draft"}`}>{path.is_published ? "Published" : "Draft"}</span></div>) : <p className="admin-empty">No learning paths yet. Create a draft to begin.</p>}
          </section>
          <section className="admin-panel admin-quick-panel"><p className="eyebrow">QUICK ACTIONS</p><h2>Build your learning community</h2><p>Invite a new educator or learner, then add reviewed lessons to a learning path.</p><button className="admin-action-card" onClick={() => setSection("accounts")}><span>＋</span><strong>Create an account</strong><small>Add a learner or instructor</small></button><button className="admin-action-card" onClick={() => setSection("content")}><span>✳</span><strong>Publish learning content</strong><small>Organize paths and lesson materials</small></button><div className="admin-quiet-stats"><span><strong>{overview.active_accounts}</strong> active accounts</span><span><strong>{overview.classrooms}</strong> active classrooms</span></div></section>
        </div>
      </>}

      {section === "accounts" && <div className="admin-columns">
        <section className="admin-panel admin-form-panel"><p className="eyebrow">ACCOUNT SETUP</p><h2>Create an account</h2><p className="admin-panel-intro">Set up an account for a learner or instructor. Share the password with them privately.</p>
          <form className="admin-form" onSubmit={createAccount}><label>Full name<input required maxLength={70} value={account.name} onChange={(event) => setAccount({ ...account, name: event.target.value })} placeholder="Name" /></label><label>Email address<input required type="email" maxLength={254} value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} placeholder="name@example.com" /></label><label>Account type<select value={account.role} onChange={(event) => setAccount({ ...account, role: event.target.value })}><option value="learner">Learner</option><option value="instructor">Instructor</option></select></label><label>Temporary password<input required type="password" minLength={8} maxLength={128} value={account.password} onChange={(event) => setAccount({ ...account, password: event.target.value })} placeholder="At least 8 characters" autoComplete="new-password" /></label><button className="button button-primary" type="submit" disabled={saving}>{saving ? "Creating…" : "Create account"} <span>→</span></button></form>
        </section>
        <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">PEOPLE</p><h2>Accounts <span className="admin-count">{accounts.length}</span></h2></div></div>
          <div className="admin-account-list">{accounts.map((item) => <div className="admin-account-row" key={item.id}><span className="admin-avatar">{item.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div className="admin-row-copy"><strong>{item.name}</strong><small>{item.email}</small></div><span className={`admin-role-tag ${item.role}`}>{item.role}</span><span className={`admin-status ${item.is_active ? "published" : "draft"}`}>{item.is_active ? "Active" : "Inactive"}</span><button className="admin-small-button" disabled={saving || (item.id === user.id && item.is_active)} onClick={() => toggleAccount(item)}>{item.is_active ? "Deactivate" : "Activate"}</button></div>)}</div>
        </section>
      </div>}

      {section === "content" && <>
        <div className="admin-columns admin-content-forms">
          <section className="admin-panel admin-form-panel"><p className="eyebrow">PATH DESIGN</p><h2>Create a learning path</h2><p className="admin-panel-intro">Paths start as drafts. Publish when the path and its lessons are ready for learners.</p>
            <form className="admin-form" onSubmit={createPath}><label>Path title<input required maxLength={200} value={pathForm.title} onChange={(event) => setPathForm({ ...pathForm, title: event.target.value })} placeholder="Everyday greetings" /></label><label>Level<select value={pathForm.level} onChange={(event) => setPathForm({ ...pathForm, level: event.target.value })}><option>Beginner</option><option>Elementary</option><option>Intermediate</option><option>Advanced</option><option>All levels</option></select></label><label>Description<textarea rows="3" value={pathForm.description} onChange={(event) => setPathForm({ ...pathForm, description: event.target.value })} placeholder="What will learners practice?" /></label><button className="button button-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save path draft"} <span>→</span></button></form>
          </section>
          <section className="admin-panel admin-form-panel"><p className="eyebrow">LESSON DESIGN</p><h2>Add a lesson</h2><p className="admin-panel-intro">Lesson material uses a sections array with a title and body for each section.</p>
            <form className="admin-form" onSubmit={createLesson}><label>Learning path<select required value={lessonForm.path_id} onChange={(event) => setLessonForm({ ...lessonForm, path_id: event.target.value })}><option value="">Choose a path</option>{paths.map((path) => <option key={path.id} value={path.id}>{path.title}</option>)}</select></label><label>Lesson title<input required maxLength={200} value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} placeholder="Introduce yourself" /></label><label>Description<textarea rows="2" value={lessonForm.description} onChange={(event) => setLessonForm({ ...lessonForm, description: event.target.value })} placeholder="A short learner-facing description" /></label><label>Duration in minutes<input type="number" min="0" max="600" value={lessonForm.duration_minutes} onChange={(event) => setLessonForm({ ...lessonForm, duration_minutes: event.target.value })} /></label><label>Lesson material (JSON)<textarea className="admin-code-input" rows="7" value={lessonForm.content} onChange={(event) => setLessonForm({ ...lessonForm, content: event.target.value })} spellCheck="false" /></label><button className="button button-primary" type="submit" disabled={saving || !paths.length}>{saving ? "Saving…" : "Save lesson draft"} <span>→</span></button></form>
          </section>
        </div>
        <section className="admin-panel admin-content-list"><div className="admin-panel-heading"><div><p className="eyebrow">EDITORIAL LIBRARY</p><h2>Paths and lessons</h2></div><span className="admin-quiet-label">Drafts are private to the admin workspace</span></div>
          {paths.length ? paths.map((path) => <article className="admin-path-card" key={path.id}><div className="admin-path-heading"><div><span className="admin-path-level">{path.level || "Learning path"}</span><h3>{path.title}</h3><p>{path.description || "No description added yet."}</p><small>{lessonsByPath[path.id]?.length || 0} lesson(s) · <code>{path.slug}</code></small></div><div className="admin-path-actions"><span className={`admin-status ${path.is_published ? "published" : "draft"}`}>{path.is_published ? "Published" : "Draft"}</span><button className={`admin-publish-button ${path.is_published ? "is-published" : ""}`} disabled={saving} onClick={() => togglePath(path)}>{path.is_published ? "Unpublish" : "Publish path"}</button></div></div>
            {(lessonsByPath[path.id] || []).map((lesson) => <div className="admin-lesson-row" key={lesson.id}><span className="admin-lesson-mark">↳</span><div className="admin-row-copy"><strong>{lesson.title}</strong><small>{lesson.duration_minutes || 0} min · {lesson.content?.sections?.length || 0} sections · <code>{lesson.slug}</code></small></div><span className={`admin-status ${lesson.is_published ? "published" : "draft"}`}>{lesson.is_published ? "Published" : "Draft"}</span><button className="admin-small-button" disabled={saving || (!lesson.is_published && !path.is_published)} title={!path.is_published && !lesson.is_published ? "Publish the path first" : ""} onClick={() => toggleLesson(lesson)}>{lesson.is_published ? "Unpublish" : "Publish"}</button></div>)}
            {!lessonsByPath[path.id]?.length && <p className="admin-empty admin-path-empty">No lessons yet. Add one using the lesson form above.</p>}
          </article>) : <p className="admin-empty">No paths yet. Create the first one above.</p>}
        </section>
      </>}
    </>}
  </div>;
}
