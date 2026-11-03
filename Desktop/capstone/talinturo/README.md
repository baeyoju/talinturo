# Talinturo

Talinturo is a Filipino Sign Language (FSL) learning app for learners, families, and educators. It pairs a responsive React interface with a Python Flask API and PostgreSQL-backed learning content and progress.

> **Status:** Development MVP. Published learning content and learner progress are read from PostgreSQL; empty tables produce empty states and an in-app list of records to add.

## What is included

- **Learner experience:** Dashboard, learning paths, vocabulary search, camera practice preview, scenario activity and results, level challenge, and progress.
- **Instructor experience:** Dashboard, learner roster and details, virtual classrooms, classroom creation, and student management.
- **Shared screens:** Landing, sign in and sign up, profile setup and editing, settings, password recovery information, help, and not-found handling.
- **API:** Account creation and login, profile and preferences, PostgreSQL content and progress endpoints, and instructor classroom and roster endpoints.

## Technology

- React and JavaScript, with React Router
- Vite development server and production build
- Python and Flask, with Flask-CORS
- PostgreSQL for application content and progress; SQLite is available for authentication tests and optional local demo mode

The current app **does not** include MediaPipe tracking, a Random Forest classifier, YOLO object detection, or camera-based sign recognition. The camera feature is a local preview only; it does not record or upload video. These recognition technologies are possible future work, not part of the current implementation.

## Architecture

```text
React app (Vite)
      │  /api requests
      ▼
Flask API ─── PostgreSQL
         └── SQLite (optional local development/testing)
```

In development, Vite proxies `/api` requests to Flask at `http://127.0.0.1:5000`. Restore `backend/talinturo.sql`, apply `backend/talinturo_backend_migration.sql`, and configure `DATABASE_URL` to use PostgreSQL. The API does not silently substitute sample content when the database is empty. See [SETUP.md](SETUP.md) for setup and the records required to populate the app.

## Project layout

```text
talinturo/
├── backend/
│   ├── app.py
│   ├── talinturo.sql
│   ├── talinturo_backend_migration.sql
│   ├── requirements.txt
│   └── test_app.py
├── src/
│   ├── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── DEVELOPMENT_LOG.md
├── SETUP.md
├── package.json
└── vite.config.js
```

## Documentation

- [Setup and local development](SETUP.md) — prerequisites, install/run steps, demo accounts, tests, and local configuration.
- [Environment variables](ENVIRONMENT.md) — backend database, session, and Google sign-in configuration.
- [Development log](DEVELOPMENT_LOG.md) — implementation summary, validation, and follow-up work.

## FSL and privacy

FSL is a living language belonging to the Filipino Deaf community. Sample vocabulary and scenarios in this MVP are illustrative and are not an authoritative dictionary or a replacement for learning from Deaf FSL signers and qualified educators. Have learning content reviewed by community members before using it for instruction.

The local demo is not production-ready. Before deployment, configure a strong secret key, HTTPS and secure cookies, production CORS settings, account recovery, authentication protections, and age-appropriate privacy controls. Demo sign-in is disabled by default; see [SETUP.md](SETUP.md) before enabling it for local interface testing.
