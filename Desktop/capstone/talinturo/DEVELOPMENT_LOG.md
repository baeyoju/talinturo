# Talinturo Development Log

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
