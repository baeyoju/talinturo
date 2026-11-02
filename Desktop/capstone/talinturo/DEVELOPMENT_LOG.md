# Talinturo Development Log

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
- Add a real sign-recognition model if camera-based recognition is required. The current camera feature is preview-only and does not recognize signs.
- Replace demonstration learner records and progress summaries with authenticated, persisted production data.
- Before deployment, configure production secrets, HTTPS, secure cookies, CORS, authentication protections, and age-appropriate privacy controls.
