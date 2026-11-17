# Talinturo

Talinturo is a Filipino Sign Language (FSL) learning app for learners, families, and educators. It pairs a React interface with a Flask API and PostgreSQL database.

> **Status:** Development MVP. Learning content and records must be reviewed before real instructional use. The camera features display and compare landmark coordinates; they do not provide validated FSL sign recognition.

## What the app includes

- **Learners:** learning paths and video lessons, lesson quizzes, vocabulary and saved signs, practice activities, scenarios, challenges, progress, and classroom membership.
- **Instructors:** learner dashboard and roster, learner details, classroom creation, and student management.
- **Administrators:** overview metrics and activity analytics, account status and account creation, learning path, lesson and activity authoring and publishing, plus the Sign Lab.
- **Sign Lab:** record labeled camera landmark frames and export CSV or XLSX files. Load a CSV/XLSX landmark dataset, choose a target word, and compare a live camera sample with the imported coordinates. The experimental nearest-coordinate comparison is a development tool, not a trained or validated recognition model.
- **Authentication:** email/password login and signup, optional Google OAuth, role-based admin and instructor access. The browser restores a login from the HTTP-only Flask session cookie when the app reloads. Local development persists the cookie signing key in the ignored `backend/instance/session.key`; deployments must configure a shared `TALINTURO_SECRET_KEY`.

Admin access is not offered on public sign-in or signup screens. Promote a trusted account in PostgreSQL and sign in through the standard login page; see [admin setup](docs/SETUP.md#admin-and-instructor-access).

## Technology and data

- React, React Router, Vite, and JavaScript
- Python, Flask, Flask-CORS, Authlib, and `psycopg`
- PostgreSQL, including Supabase when used as a managed PostgreSQL host
- MediaPipe Tasks Vision for in-browser hand, face, and pose landmarks
- ExcelJS for XLSX import and export in the Sign Lab

The Vite development server proxies `/api` requests to Flask at `http://127.0.0.1:5000`. Flask reads the project-root `.env` and connects to PostgreSQL. Camera frames stay in the browser; they are not sent to Talinturo or saved as video. The Sign Lab exports coordinate rows locally in the browser.

The database structure is defined in [`sql/talinturo_schema.sql`](sql/talinturo_schema.sql). It creates schema only and does not add sample users, lessons, or learner records. Apply it to a new empty database; use the numbered scripts in `migrations/` only when upgrading an existing database from the corresponding older schema.

## Project structure

```text
talinturo/
├── backend/
│   ├── app.py                       # Flask API, auth, and PostgreSQL access
│   ├── requirements.txt             # Python dependencies
│   ├── test_app.py                  # API tests (require a separate test database)
│   └── instance/                    # Ignored local session signing key, created at runtime
├── docs/
│   ├── DATABASE_CONNECTION_SETUP.md # Local PostgreSQL and Supabase connection setup
│   ├── DEVELOPMENT_LOG.md           # Implementation history and validation notes
│   ├── ENVIRONMENT.md                # Backend environment variables and security notes
│   └── SETUP.md                      # Installation, database, auth, and run instructions
├── frontend/
│   ├── public/                       # Static public assets
│   ├── src/
│   │   ├── adapters/http/            # API client, including cookie credentials
│   │   ├── app/                      # App shell, routes, guards, and session hooks
│   │   ├── components/               # Shared UI, layout, brand, and feedback components
│   │   ├── constants/                # Navigation and shared constants
│   │   ├── features/
│   │   │   ├── activities/           # Scenarios, challenges, results
│   │   │   ├── admin/                # Admin workspace and camera/data Sign Lab
│   │   │   ├── auth/                 # Landing, login, signup, and password screens
│   │   │   ├── classroom/            # Learner classroom membership
│   │   │   ├── help/                 # Help and not-found pages
│   │   │   ├── instructor/           # Instructor dashboard and learner management
│   │   │   ├── lesson/               # Lesson player, quizzes, and landmark camera
│   │   │   ├── onboarding/           # Profile setup
│   │   │   ├── path/                 # Learning paths
│   │   │   ├── practice/             # Learner practice
│   │   │   ├── profile/              # Profile and settings
│   │   │   ├── progress/             # Progress dashboard
│   │   │   └── vocabulary/           # Sign vocabulary and favorites
│   │   ├── styles/                   # Global and feature styles
│   │   └── utils/                    # Shared presentation utilities
│   ├── index.html                    # Vite HTML entry
│   ├── package.json                  # Frontend dependencies and scripts
│   └── vite.config.js                # Vite config and `/api` proxy
├── migrations/                       # Ordered SQL upgrades for existing databases
├── sql/
│   ├── talinturo_schema.sql          # Current schema for a new empty database
│   └── talinturo_database.sql        # Alternate earlier schema script; do not use for new installs
├── .env.example                      # Safe environment variable template
├── .gitignore
├── package.json                      # Root npm dependency manifest
├── package-lock.json
└── README.md
```

Generated folders such as `node_modules/`, Python virtual environments, and local `backend/instance/` data are omitted.

## Documentation

- [Setup and local development](docs/SETUP.md) — install and run the app, configure PostgreSQL, use admin tools, and verify the environment.
- [Environment configuration](docs/ENVIRONMENT.md) — database, session, cookie, demo, and OAuth settings.
- [Database connection setup](docs/DATABASE_CONNECTION_SETUP.md) — connect to local PostgreSQL or Supabase PostgreSQL.
- [Development log](docs/DEVELOPMENT_LOG.md) — dated implementation notes and validation history.

## FSL and privacy

FSL is a living language belonging to the Filipino Deaf community. Review instructional content with Deaf FSL signers and qualified educators before publishing it. The Sign Lab's landmark distance comparison is experimental and should not be used as an assessment of signing proficiency.

Before deployment, configure a strong shared session key, HTTPS and secure cookies, production CORS settings, account recovery, authentication protections, and age-appropriate privacy controls. Keep database credentials and private OAuth values out of source control. Demo sign-in is disabled by default.
