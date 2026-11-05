# Local setup

This guide covers installing, running, and testing Talinturo on a development machine. For an overview of the app and its current scope, see [README.md](README.md).

## Requirements

- Node.js 18 or newer, with npm
- Python 3.10 or newer

## Install

Run these commands from the project root.

### Configure private settings

The backend loads local configuration from the project-root `.env` file. It is ignored by Git and already included in this checkout. For a fresh checkout, create it from the safe template:

```powershell
Copy-Item .env.example .env
notepad .env
```

Keep database passwords, OAuth secrets, and the Flask session key in `.env`, never in committed code or `.env.example`. Generate a session key with the command shown in `.env`. Restart Flask after editing the file.

### Start the Flask API

In the first terminal:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

The API listens at `http://127.0.0.1:5000`. Without `DATABASE_URL`, it creates a local SQLite database for development and tests. Demo accounts are not created unless `TALINTURO_DEMO_MODE=true`. Learning content and progress APIs require PostgreSQL; SQLite does not provide sample-content fallbacks.

If PowerShell does not allow activating the virtual environment, you can invoke its Python directly instead:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

### Start the React app

In a second terminal at the project root:

```powershell
npm install
npm run dev
```

Open the URL Vite prints, normally `http://127.0.0.1:5173`. Vite forwards requests under `/api` to the Flask API, so both servers need to be running for backend features.

### Connect PostgreSQL

The backend uses PostgreSQL whenever `DATABASE_URL` is set. The project-root `talinturo.sql` dump contains the tables and data currently exported from PostgreSQL.

#### If the database is empty

```powershell
createdb -U postgres -W talinturo
psql -U postgres -W -d talinturo -v ON_ERROR_STOP=1 -f .\talinturo.sql
```

Use a new empty database for this dump. It creates tables and inserts exported rows; it is not idempotent and does not migrate an older schema. Back up existing data and plan an explicit migration before using it with an existing Talinturo database. Review inserted rows for private learner data before importing or sharing the dump.

Then edit `.env` in the project root. `DATABASE_URL` selects PostgreSQL; `PG*` values provide connection details and credentials:

```dotenv
DATABASE_URL=postgresql://127.0.0.1:5432/talinturo
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=talinturo
PGUSER=postgres
PGPASSWORD=your-local-database-password
TALINTURO_SECRET_KEY=your-generated-private-session-key
TALINTURO_DEMO_MODE=false
```

Replace the sample password and session key with private values. Start Flask from the project root so it loads `.env`:

```powershell
.\backend\.venv\Scripts\python.exe backend\app.py
```

If PostgreSQL is remote or uses a different username, host, or port, change those values. The API validates its required tables and columns at startup; `/api/health` checks the active database connection. Account signup/login, Google OAuth, profile, preferences, learning content, and progress all use the database selected by `DATABASE_URL`. SQLite accounts are not automatically copied into PostgreSQL.

#### If using Supabase

Talinturo uses Supabase as managed PostgreSQL through its existing Flask/`psycopg` database connection. In Supabase, open your project and select **Connect**, then copy a PostgreSQL connection URI (the Session Pooler URI is suitable for local development). Replace `DATABASE_URL` in the root `.env` with that full URI, using your Supabase database password if prompted. Preserve the URI's host, port, username, database name, and SSL options. URL-encode special characters in the password.

The Supabase Project URL and `anon`/publishable or `service_role`/secret API keys are for Supabase APIs; this Flask app does not use them to connect to the database. Do not add them as `SUPABASE_URL` or `SUPABASE_KEY` for this setup. Keep the connection URI private, and do not send it in chat or commit it. The standalone `/todos` sample is not part of this app.

Run the project-root `talinturo.sql` in Supabase's **SQL Editor** to restore the exported schema and rows. Back up any existing data first; the dump is not a migration for a different or older schema. Review and remove private or unwanted account rows before importing. Restart Flask after updating `.env`, then check `http://127.0.0.1:5000/api/health`.

If you already have the current schema in an existing database, make sure the lesson media columns are present:

```sql
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT;
```

Set `DATABASE_URL` and any required `PG*` variables in `.env`, then restart Flask. If the frontend says it cannot reach the learning database, first check that Flask started successfully and that these settings point to a running PostgreSQL server and the intended database.

In another PowerShell window from the project root, start the frontend with `npm run dev`. Open `http://127.0.0.1:5173`; Vite proxies `/api` requests to Flask. Both servers must remain running.

### Admin and instructor access

Open `/instructor/sign-in` for the dedicated educator sign-in page. Admins sign in at `/login` and are routed to `/admin`. The admin workspace requires PostgreSQL and supports account activation, creating learner/instructor accounts, creating learning paths and lessons, and publishing or unpublishing them.

Promote a trusted existing account to the admin role from the PostgreSQL database. Replace the email with that account's address and run this once:

```sql
UPDATE users SET role = 'admin' WHERE lower(email) = lower('admin@example.com');
```

The admin role is deliberately not offered in public signup or the account creation form. Existing PostgreSQL databases also need the account status and lesson publish flags:

```sql
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;
```

Restart Flask after the migration. New lessons begin as drafts; publish a lesson and its learning path before learners can see it.

### Sample records

The `talinturo.sql` dump includes `INSERT` statements for rows exported from its source database. It is a point-in-time dump, not a repeatable seed script; run it only once against a new empty database. Inspect the inserted rows and remove private learner or account data that should not be copied to the target database.

Review and verify imported learning records before using them for instruction. Add and publish verified learning records as needed:

- `learning_paths`: `slug`, `title`, `description`, `level`, and `is_published`. Paths are ordered by `path_id`.
- `lessons`: `path_id`, `slug`, `title`, `duration_minutes`, `content` (JSONB), and optional `image_url` and `video_url`. Lesson `content` should include a `description` and a `sections` array of `{ "title": "...", "body": "..." }`. Set `image_url` to an image URL and `video_url` to a browser-playable video URL (for example MP4 or WebM); lessons are ordered by `lesson_id`.
- `signs`: `lesson_id`, `slug`, `word`, `meaning`, `category`, optional `hint` and `media_url`, and `is_published`.
- `activities`: unique `slug`, `path_id`, `activity_type` (`practice`, `scenario`, or `challenge`), `title`, `content` (JSONB), and `is_published`. Activities are ordered by `activity_id`.
  - Scenario/challenge `content` can include `category`, `description`, `emoji`, `color`, and `duration_minutes`; it uses `questions: [{ "prompt": "...", "choices": [{ "id": "...", "label": "...", "meaning": "...", "is_correct": true }] }]`. Exactly one choice per question should be correct.
  - Practice `content` uses `word`, `meaning`, `steps` (array of strings), and optional `category`, `hint`, and `media_url`.
- `achievements`: `slug`, `title` (used as the API's display name), `description`, and `criteria` (JSONB). `user_achievements` links earned definitions to users through `user_id` and `achievement_id`.
- `activity_attempts` and `lesson_progress` are learner-generated records. Completing published activities and lessons creates these records; do not prefill fake completion metrics.

The backend exposes learner-facing APIs for published content and progress:

- `GET /api/paths` and `GET /api/paths/<id>` return published paths, lessons, lesson JSON content, lesson image/video URLs, and the signed-in learner's progress.
- `GET /api/vocabulary` returns published signs; `PUT`/`DELETE /api/vocabulary/<id>/favorite` saves/removes a learner's favorite.
- `GET /api/scenarios`, `/api/challenges`, and `/api/practice` list published activities by type. `GET /api/activities/<id>` returns one activity.
- `PUT /api/lessons/<id>/progress` saves an in-progress percentage from 1–99 without decreasing existing progress. `POST /api/lessons/<id>/complete` records 100% completion.
- `POST /api/progress/complete` validates submitted answers against the published activity questions and stores a scored attempt.
- `GET /api/progress` returns activity history, weekly activity counts, earned achievement status, streak, and recent lesson progress. `GET /api/dashboard` returns learner summary metrics.

These APIs require authentication. Content creation and publication are currently done by inserting/updating the PostgreSQL records directly; the app does not provide an admin content editor or fabricate FSL content.

- `GET /api/classrooms` lists the signed-in learner's active classrooms; `POST /api/classrooms/join` joins one using its invite code.
- Instructor routes create classrooms, add an existing learner account by email, and manage its roster. Learners can also join directly with the shared classroom code.

The app's `/api/data/readiness` response and dashboard empty state list missing published content. Have FSL vocabulary and instructional material reviewed by Deaf FSL signers and qualified educators before publishing; the interface does not supply authoritative language content. SQLite and PostgreSQL are separate databases, and local SQLite accounts are not copied when switching to PostgreSQL.

## Demo accounts

Optional local SQLite demo accounts are created only when `TALINTURO_DEMO_MODE=true` is set before the backend starts. They are for local interface testing; they do not supply PostgreSQL learning content.

| Role | Email | Password |
| --- | --- | --- |
| Learner | `learner@example.com` | `Talinturo2025!` |
| Instructor | `teacher@example.com` | `Talinturo2025!` |

New accounts created through sign up are stored in the configured database with salted PBKDF2 password hashes. Google sign-in creates or links an account only when Google confirms the email address. Password-reset email delivery is not configured in this development setup.

## Google sign-in and sign-up setup

Google authentication needs a Google OAuth client; the app cannot complete a real Google login until you configure these credentials.

1. In Google Cloud Console, configure the OAuth consent screen. While the app is in testing mode, add each test account under **Test users**.
2. Create an OAuth client ID for a **Web application**.
3. Add this authorized JavaScript origin and redirect URI:

- Origin: `http://127.0.0.1:5173`
- Redirect URI: `http://127.0.0.1:5173/api/auth/google/callback`

4. In the PowerShell terminal that runs Flask, set the client ID, secret, and matching redirect/frontend URLs. Restart Flask after setting them:

```powershell
$env:GOOGLE_CLIENT_ID = "your-client-id"
$env:GOOGLE_CLIENT_SECRET = Read-Host "Google client secret"
$env:GOOGLE_REDIRECT_URI = "http://127.0.0.1:5173/api/auth/google/callback"
$env:TALINTURO_FRONTEND_URL = "http://127.0.0.1:5173"
$env:TALINTURO_SECRET_KEY = (python -c "import secrets; print(secrets.token_urlsafe(32))")
python app.py
```

The landing page and sign-up screen use **Sign up with Google**; the login screen uses **Continue with Google**. A new Google sign-up creates a learner account and continues to profile setup. Google login only signs in an existing Talinturo account. A verified Google email can be linked to an existing account with the same email. Google verifies the email address, and the API stores the provider subject in `oauth_accounts`.

Use the exact same host throughout; `localhost` and `127.0.0.1` are different OAuth origins. Do not share or commit the client secret. For deployment, register the deployed HTTPS frontend origin and callback URI with Google, configure the backend to route that callback path to Flask, and set these variables to the deployed HTTPS URLs. Keep `TALINTURO_SECRET_KEY` stable across restarts so OAuth state verification succeeds when Google redirects back. Vite proxies `/api` to Flask during local development.

If Google sign-in reports it is not configured, confirm both credentials are set in the Flask terminal and restart the API. If Google reports a redirect URI mismatch, make the `GOOGLE_REDIRECT_URI` value exactly match the URI registered in Google Cloud Console.

## Verify the setup

With the API running, check its health endpoint:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/health
```

Run the backend tests from the project root:

```powershell
.\backend\.venv\Scripts\python.exe -m unittest backend.test_app
```

Create a production frontend bundle with:

```powershell
npm run build
```

## Local configuration and deployment

The API uses these optional environment variables:

| Variable | Local default | Purpose |
| --- | --- | --- |
| `TALINTURO_SECRET_KEY` | Random per process if unset | Flask session signing. Set a stable private value in `.env`. |
| `DATABASE_URL` | Unset | PostgreSQL connection URL. When set, PostgreSQL is used instead of SQLite. |
| `TALINTURO_DATABASE` | `backend/talinturo.sqlite3` | SQLite database file path when `DATABASE_URL` is unset. |
| `TALINTURO_DEMO_MODE` | `false` | Enables local demo accounts and demo role switching. |
| `TALINTURO_COOKIE_SECURE` | `false` | Set to `true` when serving over HTTPS. |
| `FLASK_DEBUG` | `false` | Enables Flask debug mode when set to `true`; use only for local development. |

The backend reads these settings from the project-root `.env` file. See [DATABASE_CONNECTION_SETUP.md](DATABASE_CONNECTION_SETUP.md) for detailed local PostgreSQL and Supabase IPv4/IPv6 setup and troubleshooting. See [ENVIRONMENT.md](ENVIRONMENT.md) for all supported database and Google OAuth settings and instructions for generating a session key.

Do not commit secrets. `TALINTURO_DEMO_MODE=false` disables demo role switching. Before public deployment, also use HTTPS with `TALINTURO_COOKIE_SECURE=true`, configure production CORS, and implement production-grade account recovery, authentication protections, and privacy controls. Do not enable secure cookies when testing over plain local HTTP. The camera feature is preview-only and does not recognize signs.

## Troubleshooting

- **The app opens but API features fail:** Confirm Flask is running at `127.0.0.1:5000` and that the browser is using the Vite URL.
- **Port 5173 or 5000 is already in use:** Stop the other local process or configure the development server and proxy to use matching free ports.
- **Python packages are missing:** Activate the backend virtual environment and run `pip install -r requirements.txt` from the backend directory.
- **Demo data needs a fresh start:** Stop Flask and remove only `backend/talinturo.sqlite3`, then start Flask again to recreate the seeded local database. This permanently deletes local accounts, classrooms, and progress stored in that database.
