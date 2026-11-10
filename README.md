# Talinturo

Talinturo is a gamified Filipino Sign Language (FSL) learning app for learners, families, and educators. It pairs a responsive React interface with a Python Flask API and a local SQLite database.

> **Status:** Working development MVP. Sample lessons, learner records, and classroom data demonstrate the experience; they are not production learning content or records.

## What is included

- **Learner experience:** Dashboard, learning paths, vocabulary search, camera practice preview, scenario activity and results, level challenge, and progress.
- **Instructor experience:** Dashboard, learner roster and details, virtual classrooms, classroom creation, and student management.
- **Shared screens:** Landing, sign in and sign up, profile setup and editing, settings, password recovery information, help, and not-found handling.
- **API:** Demo-role sessions, account creation and login, profile and progress endpoints, and instructor classroom and roster endpoints.

## Technology

- React and JavaScript, with React Router
- Vite development server and production build
- Python and Flask, with Flask-CORS
- SQLite for local development data

The current app **does not** include MediaPipe tracking, a Random Forest classifier, YOLO object detection, or camera-based sign recognition. The camera feature is a local preview only; it does not record or upload video. These recognition technologies are possible future work, not part of the current implementation.

## Architecture

```text
React app (Vite)
      │  /api requests
      ▼
Flask API ─── SQLite
```

In development, Vite proxies `/api` requests to Flask at `http://127.0.0.1:5000`. The API creates a local SQLite database and seeds sample demo data on its first start.

## Project layout

> **Development note:** This is the current project layout and may change as development continues.

```text
talinturo/
├── .agents/                         # Project agent skills and lock file
├── .vscode/                         # Workspace editor settings
├── backend/
│   ├── app.py                       # Flask API and SQLite setup
│   ├── requirements.txt             # Python dependencies
│   └── test_app.py                  # Backend tests
├── docs/
│   ├── DATABASE_CONNECTION_SETUP.md
│   ├── DEVELOPMENT_LOG.md
│   ├── ENVIRONMENT.md
│   └── SETUP.md
├── frontend/                        # Vite and React application
│   ├── public/                      # Static assets (currently the app logo)
│   ├── src/
│   │   ├── adapters/http/           # API client
│   │   ├── app/                     # App entry, routes, guards, and hooks
│   │   ├── assets/mascots/          # Mascot component assets
│   │   ├── components/              # Shared brand, feedback, layout, and UI
│   │   ├── constants/               # Shared constants
│   │   ├── features/                # Feature modules and their pages
│   │   │   ├── activities/          # Scenarios, challenges, and results
│   │   │   ├── admin/
│   │   │   ├── auth/                # Landing, login, and password screens
│   │   │   ├── classroom/
│   │   │   ├── help/
│   │   │   ├── instructor/          # Instructor and learner management
│   │   │   ├── lesson/
│   │   │   ├── onboarding/
│   │   │   ├── path/                # Learning path and lesson media
│   │   │   ├── practice/
│   │   │   ├── profile/             # Profile, avatar, and settings
│   │   │   ├── progress/
│   │   │   └── vocabulary/
│   │   └── styles/                  # Global and feature stylesheets
│   ├── components.json
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── migrations/                      # SQL migration scripts
├── sql/                             # Database schema and setup scripts
├── .env.example
├── .gitignore
├── package.json                     # Root scripts
├── package-lock.json
└── README.md
```

Generated dependencies and local machine artifacts (including `node_modules/` and `microsoft/windows/powershell/ModuleAnalysisCache`) are omitted.

## Documentation

- [Setup and local development](docs/SETUP.md) — prerequisites, install/run steps, demo accounts, tests, and local configuration.
- [Development log](docs/DEVELOPMENT_LOG.md) — implementation summary, validation, and follow-up work.

## FSL and privacy

FSL is a living language belonging to the Filipino Deaf community. Sample vocabulary and scenarios in this MVP are illustrative and are not an authoritative dictionary or a replacement for learning from Deaf FSL signers and qualified educators. Have learning content reviewed by community members before using it for instruction.

The local demo is not production-ready. Before deployment, configure a strong secret key, HTTPS and secure cookies, production CORS settings, account recovery, authentication protections, and age-appropriate privacy controls. Demo sign-in is enabled by default for local development; see [docs/SETUP.md](docs/SETUP.md) before exposing the app.
