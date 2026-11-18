# Talinturo Development Log

Entries below are historical snapshots. For current setup instructions, use the README and setup guides; older entries may name files or behavior that have since changed.

## November 17, 2026 — Admin Sign Lab, analytics, and session persistence

- Documented the admin workspace analytics, account management, and learning content authoring tools.
- Documented the admin Sign Lab workflow for in-browser landmark capture, CSV/XLSX export and import, and experimental live coordinate comparison. It is not a validated sign recognition model; camera frames are not saved as video or uploaded.
- Fixed the local Flask session signing key so it is generated once under the ignored `backend/instance/` directory and reused across backend restarts. The frontend already restores the signed-in account from `/api/auth/me` after a browser reload. Deployments must configure the same stable `TALINTURO_SECRET_KEY` across backend workers.
- Updated setup guides to point to `sql/talinturo_schema.sql`, which creates the current schema without inserting sample data, and corrected the frontend npm commands to run against `frontend/`.

## November 16, 2026 — Lesson practice and live landmarks

### Lesson completion flow

- Video completion now records 50% lesson progress. Learners proceed to a practice quiz; completing all correct answers and confirming practice records 100%.
- Lesson authors can put lesson-specific questions in `lessons.content.practice.questions`. Correct-answer flags are checked by the API and are not returned to learners. Lessons without configured questions receive a basic fallback question.
- Updated lesson path actions to distinguish starting, resuming, and restarting lessons.

### Camera landmarks

- Added a live, in-browser MediaPipe camera overlay for pose, face, and hand landmarks. Body and face landmarks are shown when a face is detected; hand landmarks can be shown independently.
- Uses the dedicated Hand Landmarker for finger joints with light frame-to-frame smoothing. Camera preview and landmark overlay share the same fitted frame and zoom.
- Camera frames are processed in the browser, not recorded or sent to Talinturo's API. The current feature displays landmarks and does not classify FSL signs.

### Documentation

- Updated README and setup instructions for PostgreSQL, the lesson progress milestones, lesson-specific quiz JSON, MediaPipe runtime/model downloads, and camera privacy behavior.

## November 8, 2026 — Project structure cleanup and folder reorganization

### Repository layout update

- Updated the README project layout to reflect the current folder hierarchy, including the frontend feature structure, project skills, database migrations, and SQL scripts.
- Separated and organized files into their designated folders
- Added a short purpose description for each documented folder and omitted individual files, generated dependencies, the Python virtual environment, and local cache folders.
- This was a documentation-only update; no repository folders or application behavior were changed.

### Validation

- Compared the documented folders against the current workspace tree.
- `git diff --check` — passed.

## November 6, 2026 — Lesson player and duration format

### Learner lesson experience

- Added a dedicated lesson page with video playback, a subtitles toggle, transcript display, lesson notes, and a finish action.
- Changed learning-path lesson actions to **Continue** and replaced learner-facing image URL setup instructions with a missing-image placeholder.
- Added admin-only fields for lesson images, video, subtitles, and transcripts, including editing media on existing lessons.
- Allowed video-only lessons to be completed.

### Lesson duration

- Changed `lessons.duration_minutes` from integer minutes to text in `M:SS` format, such as `3:36`, in both PostgreSQL schema files.
- Added `migrations/002_lesson_duration_mmss.sql` to convert existing integer values to `N:00` and enforce the new format. A matching SQL query was provided for running in pgAdmin.
- Updated lesson creation validation and admin and learner displays to use `M:SS` values. Backend startup now reports when the existing database still needs the migration.

### Validation

- Python syntax compilation — passed.
- `npm.cmd run build` — passed.
- The PostgreSQL migration was not run against a live database; apply it in pgAdmin before starting the app against the existing integer column.
- Automated tests were not run.

## November 5, 2026 — Database connection setup guide

### PostgreSQL connection documentation

- Added `DATABASE_CONNECTION_SETUP.md` with local PostgreSQL setup through DBeaver or pgAdmin and Supabase direct/session-pooler connection instructions.
- Clarified that DBeaver and pgAdmin are clients and require a running PostgreSQL server for a local database.
- Documented IPv6 requirements for Supabase direct connections, IPv4 support through the Session pooler, `DATABASE_URL` precedence, schema loading, and connection error triage.
- At the time, README and setup instructions referred to an exported `talinturo.sql` dump. That dump is no longer in the project; current setup uses the schema-only `sql/talinturo_schema.sql`.
- Linked the guide from the main setup and documentation pages.

### Validation

- Reviewed the connection steps against backend configuration loading and startup behavior.
- Documentation-only change; no database connection or schema was modified.

## November 4, 2026 — Lesson media, learning journey, and private configuration

### Learning paths and lesson media

- Updated the PostgreSQL lesson API to return `image_url` and `video_url`, and added both columns to `talinturo_database.sql` with idempotent `ALTER TABLE` statements for existing databases.
- Redesigned the learning-path detail screen as a mobile-friendly game journey with a path progress summary, connected lesson nodes, lesson image previews, and expandable video demonstrations. Existing lesson titles, descriptions, sections, and progress states remain in use.
- Added fallback UI for missing or unavailable lesson images and guidance for videos that cannot play in the browser.
- Updated setup documentation with the lesson media fields and SQL needed to add them to an existing database.

### Private environment configuration

- Added project-root `.env` loading for backend configuration and ignored local root/backend environment files in Git. Added `.env.example` with safe, empty credential placeholders.
- Removed hard-coded Google OAuth credentials and the fixed Flask session key from the backend. A random key is generated if a local key is not configured; deployments should set a stable private key.
- Added `python-dotenv` to backend requirements and updated setup/environment documentation to use `.env` for database credentials, session key, and optional Google OAuth settings.
- Documented that the previously embedded Google OAuth secret should be rotated.

### Validation

- `python -m unittest backend.test_app` — passed (27 tests), including lesson media serialization and database connection guidance.
- Python syntax compilation — passed.
- `npm run build` — passed.
- `git diff --check` — passed; confirmed `.env` is ignored and `.env.example` is not ignored.
- Live PostgreSQL connection was not tested because `DATABASE_URL` is not configured in the development environment.

## November 2, 2026 — PostgreSQL backend and Google authentication

### PostgreSQL backend integration

- Added PostgreSQL support to the Flask API using `psycopg`, selected with `DATABASE_URL`; SQLite remains the default for local tests and setups without that variable.
- Added startup checks for the expected PostgreSQL tables and a database connection check at `/api/health`.
- Connected authentication, classroom memberships, invitations, activity attempts, learner progress, preferences, learning paths, vocabulary, and published scenarios to their PostgreSQL tables.
- Added optional demo seeding for accounts, a classroom, starter learning content, vocabulary, and scenarios. Demo seeding is controlled by `TALINTURO_DEMO_MODE`.
- Added account-backed preferences and updated learning content pages and instructor learner details to load from API data.
- Documented PostgreSQL setup and environment variables in `SETUP.md` and `ENVIRONMENT.md`.

### Google OAuth sign-up and login

- Added separate Google OAuth flows for account sign-up and login. Sign-up creates a learner account; login requires an existing account. Verified Google emails can link to an existing Talinturo account.
- Added redirects to profile setup or the role-appropriate dashboard, plus user-facing messages for unconfigured credentials, missing accounts, cancellation, and callback failures.
- Added a Google sign-up action to the landing page and distinct Google actions to the sign-up and login screens.
- Expanded Google OAuth callback and flow tests. Real-provider authentication requires credentials and matching authorized origin/callback settings from Google Cloud Console; it was not verified against a live Google OAuth client.

### Environment documentation

- Added `ENVIRONMENT.md` covering PostgreSQL connection settings, Flask session configuration, demo mode, and Google OAuth credentials, with PowerShell examples and secret-handling guidance.
- Linked the environment guide from `README.md` and expanded Google OAuth setup and troubleshooting instructions in `SETUP.md`.

### Validation

- `python -m unittest backend.test_app` — passed (18 tests).
- `npm run build` — passed.
- `git diff --check` and Python syntax compilation — passed.

## October 31, 2026 — Responsive layouts, interface icons, and local preview

### Responsive layout fixes

- Updated the landing page layout to adapt to its available width, with responsive header, hero, feature, and scenario sections for desktop and mobile.
- Removed legacy fixed-width landing-page styles and corrected narrow-screen overflow and sidebar spacing.
- Made the Help & About FAQ panel match the width of the page title, introduction, and contact text.

### Interface iconography

- Replaced decorative interface emojis with a consistent inline SVG icon set across navigation, dashboard cards, progress, classroom, practice, authentication, and feedback screens.
- Kept emojis that illustrate learning content, including vocabulary and scenario examples.

### Validation and preview

- `npm run build` — passed after the responsive and icon changes.
- Browser checks confirmed the landing page has no horizontal overflow down to 320px and the Help & About sections align at desktop and mobile widths.
- Checked icon rendering on the dashboard, Help & About, progress, instructor, classrooms, practice, and login screens; no empty SVG icons were found.
- Ran the Vite development server bound to `0.0.0.0` for phone preview and confirmed `http://192.168.11.10:5173` responded successfully on the local network.

## October 29, 2026 — Settings customization and OAuth basics

### Settings and readability
- Added Settings color pickers for the accent, page background, primary text, and secondary text colors. Theme changes apply throughout the app, preview live, and persist in local storage.
- Increased interface text sizes by 3px and added adaptive text shadows: when text and page background have similar brightness, the text uses a thin opposite-color shadow; otherwise, no shadow is applied.

### Google OAuth basics
- Added the basic Google OAuth sign-in flow using Authlib, including provider redirect/callback, verified-email account creation or linking, session restoration, and a Google sign-in button with failure feedback. Server credentials and redirect URLs are configurable through environment variables; tests cover the OAuth flow and account-linking behavior.

### Validation
- Validation: `npm run build` — passed.

## October 28, 2026 — Initial full-stack MVP

### Project setup

- Created a React 19 single-page application with Vite and client-side routes.
- Created a Flask API backed by SQLite, with a Vite development proxy for `/api`.
- Added project overview and implementation status to `README.md`; kept local run instructions, demo account details, and deployment setup in `SETUP.md`.

### Implemented

- Learner workspace: dashboard, learning paths, searchable FSL vocabulary, camera practice preview, scenario activity and results, level challenge feedback, and progress.
- Instructor workspace: dashboard, learner management and detail views, classroom management, classroom creation, and student roster management.
- Shared screens: welcome/landing, login, signup, profile setup and editing, settings, password recovery information, help/about, and not-found handling.
- API features: demo-role sessions, signup and login with salted PBKDF2 password hashes, profile updates, progress events, classroom creation, and instructor-only roster endpoints.
- Added responsive layouts, keyboard-visible focus states, and reduced-motion styling.

### Validation

- `npm run build` — passed.
- `py -m unittest backend.test_app` — passed (5 tests).
- Browser smoke checks passed for learner/instructor switching, vocabulary filtering, scenario feedback/results, classroom roster updates, profile saves, and mobile layout overflow.

### Follow-up work

- Configure production Google OAuth credentials and approved callback URLs; add password-reset email/token delivery.
- Integrate and validate FSL learning content with Deaf FSL signers and educators.
- Add a validated sign-recognition model if camera-based recognition is required. Learner camera practice and the admin Sign Lab display or compare landmarks; neither is a trained or validated recognition model.
- Replace demonstration learner records and progress summaries with authenticated, persisted production data.
- Before deployment, configure production secrets, HTTPS, secure cookies, CORS, authentication protections, and age-appropriate privacy controls.
