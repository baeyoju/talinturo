# Local setup

This guide covers installing, running, and testing Talinturo on a development machine. For an overview of the app and its current scope, see [README.md](README.md).

## Requirements

- Node.js 18 or newer, with npm
- Python 3.10 or newer

## Install

Run these commands from the project root.

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

The API listens at `http://127.0.0.1:5000`. By default, it creates `backend/talinturo.sqlite3` and seeds local demo accounts and sample data. The database is local and excluded from version control.

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

The backend uses the PostgreSQL schema in the `public` schema whenever `DATABASE_URL` is set. It expects the tables from the Talinturo schema (`users`, `oauth_accounts`, `user_preferences`, `classrooms`, `classroom_memberships`, `learning_paths`, `lessons`, `activities`, `vocabulary_signs`, `activity_attempts`, `lesson_progress`, `achievements`, and `user_achievements`) to exist before the API starts. The API does not create or alter PostgreSQL tables.

In the same PowerShell terminal used to start Flask, set a connection URL for your PostgreSQL server and a private Flask session key:

```powershell
$env:PGUSER = "postgres"
$env:PGPASSWORD = Read-Host "PostgreSQL password"
$env:DATABASE_URL = "postgresql://localhost:5432/postgres"
$env:TALINTURO_SECRET_KEY = (python -c "import secrets; print(secrets.token_urlsafe(32))")
$env:TALINTURO_DEMO_MODE = "true"
python app.py
```

Replace the username, host, port, and database with your PostgreSQL connection details. `PGPASSWORD` is entered at the prompt and is not included in the URL or command history. Keep it and the session key private; do not commit them. The API validates the required tables at startup and `/api/health` checks the active database connection.

When PostgreSQL is selected with demo mode enabled, the API creates `teacher@example.com` and `learner@example.com` if they do not already exist, plus a demo classroom, starter learning path, vocabulary, and scenarios. Both demo accounts use `Talinturo2025!`; keep demo mode enabled only for local development. These starter rows are inserted only when their unique slugs are absent. New accounts, classroom invitations, vocabulary and published paths, preferences, and activity progress are stored in the PostgreSQL tables. Progress submissions are recorded as completed rows in `activity_attempts`, linked to an unpublished practice activity when needed.

Without `DATABASE_URL`, the backend continues to use SQLite. SQLite and PostgreSQL are separate databases; switching to PostgreSQL does not automatically copy local SQLite accounts or activity data.

## Demo accounts

The development app opens on the public landing page. Sign in with either demo account below to open the learner or instructor workspace; once signed in, use **Instructor view** in the top bar to switch demo roles.

| Role | Email | Password |
| --- | --- | --- |
| Learner | `learner@example.com` | `Talinturo2025!` |
| Instructor | `teacher@example.com` | `Talinturo2025!` |

New accounts created through sign up are stored in the local database with salted PBKDF2 password hashes. Google sign-in creates or links an account only when Google confirms the email address. Password-reset email delivery is not configured in this development setup.

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
| `TALINTURO_SECRET_KEY` | Development-only key | Flask session signing. Set a strong private value before deployment. |
| `DATABASE_URL` | Unset | PostgreSQL connection URL. When set, PostgreSQL is used instead of SQLite. |
| `TALINTURO_DATABASE` | `backend/talinturo.sqlite3` | SQLite database file path when `DATABASE_URL` is unset. |
| `TALINTURO_DEMO_MODE` | `true` | Enables the demo role-switch endpoint. |
| `TALINTURO_COOKIE_SECURE` | `false` | Set to `true` when serving over HTTPS. |
| `FLASK_DEBUG` | `false` | Enables Flask debug mode when set to `true`; use only for local development. |

For a local run with a custom session key, generate one in PowerShell before starting Flask. Keep it private; this environment variable applies only to the current terminal session.

```powershell
$env:TALINTURO_SECRET_KEY = (python -c "import secrets; print(secrets.token_urlsafe(32))")
python app.py
```

Do not commit secrets. `TALINTURO_DEMO_MODE=false` disables demo role switching. Before public deployment, also use HTTPS with `TALINTURO_COOKIE_SECURE=true`, configure production CORS, and implement production-grade account recovery, authentication protections, and privacy controls. Do not enable secure cookies when testing over plain local HTTP. The camera feature is preview-only and does not recognize signs.

## Troubleshooting

- **The app opens but API features fail:** Confirm Flask is running at `127.0.0.1:5000` and that the browser is using the Vite URL.
- **Port 5173 or 5000 is already in use:** Stop the other local process or configure the development server and proxy to use matching free ports.
- **Python packages are missing:** Activate the backend virtual environment and run `pip install -r requirements.txt` from the backend directory.
- **Demo data needs a fresh start:** Stop Flask and remove only `backend/talinturo.sqlite3`, then start Flask again to recreate the seeded local database. This permanently deletes local accounts, classrooms, and progress stored in that database.
