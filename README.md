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

```text
talinturo/
├── .agents/                     # Agent and project-specific skills
│   └── skills/                  # Reusable agent guidance
│       ├── supabase/            # Supabase guidance
│       │   ├── assets/          # Supporting skill assets
│       │   └── references/      # Supabase reference material
│       └── supabase-postgres-best-practices/ # PostgreSQL best-practice guidance
│           └── references/      # PostgreSQL reference material
├── .vscode/                     # Workspace-specific editor settings
├── backend/                     # Flask API and backend tests
├── docs/                        # Setup, environment, and project documentation
├── frontend/                    # Vite-based React application
│   ├── public/                  # Static assets served as-is
│   │   └── signs/               # Sign-language image assets
│   └── src/                     # Frontend application source
│       ├── adapters/            # HTTP and session integration layers
│       │   ├── http/            # API client and HTTP helpers
│       │   └── session/         # Session and authentication adapters
│       ├── app/                 # App bootstrap, routing, guards, and hooks
│       │   ├── guards/          # Route access checks
│       │   └── hooks/           # App-wide React hooks
│       ├── assets/              # Imported images and visual assets
│       │   ├── avatar/          # Avatar assets
│       │   └── mascots/         # Mascot assets and components
│       ├── components/          # Shared UI components
│       │   ├── brand/           # Branding components
│       │   ├── common/          # Reusable general-purpose components
│       │   ├── feedback/        # Notices, toasts, and feedback UI
│       │   ├── layout/          # Shared page and navigation layout
│       │   └── ui/              # Reusable interface primitives
│       ├── constants/           # Shared application constants
│       ├── features/            # Feature-focused screens and components
│       │   ├── activities/      # Learning activities and results
│       │   ├── admin/           # Administrative screens
│       │   ├── auth/            # Sign-in and account access
│       │   ├── camera/          # Camera preview and related helpers
│       │   │   ├── components/  # Camera-related UI
│       │   │   ├── hooks/       # Camera behavior hooks
│       │   │   └── lib/         # Camera utilities
│       │   ├── classroom/       # Virtual classroom workflows
│       │   ├── help/            # Help and support screens
│       │   ├── instructor/      # Instructor tools and views
│       │   ├── lesson/          # Lesson content and learning flow
│       │   │   ├── components/  # Lesson UI
│       │   │   ├── hooks/       # Lesson behavior hooks
│       │   │   └── journeys/    # Lesson journey flows
│       │   ├── onboarding/      # New-user setup flow
│       │   ├── path/            # Learning paths
│       │   │   ├── components/  # Learning-path UI
│       │   │   │   └── components/ # Nested path-specific components
│       │   │   └── pages/       # Learning-path screens
│       │   ├── practice/        # Practice activities
│       │   ├── profile/         # Learner profile features
│       │   │   ├── avatar/      # Profile avatar features
│       │   │   ├── components/  # Profile-specific UI
│       │   │   ├── report/      # Learner reports
│       │   │   ├── settings/    # Profile and app settings
│       │   │   └── shop/        # Profile shop features
│       │   ├── progress/        # Learning progress views
│       │   ├── splash/          # Splash and entry screens
│       │   ├── tutorial/        # Tutorial flow
│       │   └── vocabulary/      # Vocabulary browsing and search
│       ├── i18n/                # Internationalization resources
│       ├── lib/                 # Shared utilities and helpers
│       ├── stores/              # Client-side state stores
│       ├── styles/              # Global and feature-level stylesheets
│       └── tests/               # Frontend tests
├── migrations/                  # Ordered database schema migrations
└── sql/                         # Database schema and setup scripts
```

Generated dependency, environment, and local cache folders (such as `node_modules/`, `backend/venv/`, and `microsoft/windows/powershell/`) are omitted.

## Documentation

- [Setup and local development](docs/SETUP.md) — prerequisites, install/run steps, demo accounts, tests, and local configuration.
- [Development log](docs/DEVELOPMENT_LOG.md) — implementation summary, validation, and follow-up work.

## FSL and privacy

FSL is a living language belonging to the Filipino Deaf community. Sample vocabulary and scenarios in this MVP are illustrative and are not an authoritative dictionary or a replacement for learning from Deaf FSL signers and qualified educators. Have learning content reviewed by community members before using it for instruction.

The local demo is not production-ready. Before deployment, configure a strong secret key, HTTPS and secure cookies, production CORS settings, account recovery, authentication protections, and age-appropriate privacy controls. Demo sign-in is enabled by default for local development; see [docs/SETUP.md](docs/SETUP.md) before exposing the app.
