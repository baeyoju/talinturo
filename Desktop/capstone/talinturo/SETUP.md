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
.\.`venv\Scripts\Activate.ps1`
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

The API listens at `http://127.0.0.1:5000`. On first startup, it creates `backend/talinturo.sqlite3` and seeds local demo accounts and sample data. The database is local and excluded from version control.

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

## Demo accounts

The development app signs in to the learner demo automatically. Use **Instructor view** in the top bar to switch demo roles, or sign out and use either account on the login screen.

| Role | Email | Password |
| --- | --- | --- |
| Learner | `learner@example.com` | `Talinturo2025!` |
| Instructor | `teacher@example.com` | `Talinturo2025!` |

New accounts created through sign up are stored in the local database with salted PBKDF2 password hashes. Google sign-in creates or links an account only when Google confirms the email address. Password-reset email delivery is not configured in this development setup.

## Google sign-in setup

In Google Cloud Console, configure the OAuth consent screen and add your account as a test user if the app is in testing mode. Create an OAuth client ID for a **Web application**, with this authorized JavaScript origin and redirect URI:

- Origin: `http://127.0.0.1:5173`
- Redirect URI: `http://127.0.0.1:5173/api/auth/google/callback`

Set the client ID and secret in the terminal that runs Flask. Keep the secret private and do not commit it:

```powershell
$env:GOOGLE_CLIENT_ID = "your-client-id"
$env:GOOGLE_CLIENT_SECRET = "your-client-secret"
$env:GOOGLE_REDIRECT_URI = "http://127.0.0.1:5173/api/auth/google/callback"
$env:TALINTURO_FRONTEND_URL = "http://127.0.0.1:5173"
python app.py
```

Use the exact same host throughout; `localhost` and `127.0.0.1` are different OAuth origins. For deployment, register the HTTPS callback URI with Google and set these variables to the deployed HTTPS URLs. Use a stable, private `TALINTURO_SECRET_KEY` so OAuth state verification succeeds after Google redirects back. Vite proxies `/api` to Flask during local development.

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
| `TALINTURO_DATABASE` | `backend/talinturo.sqlite3` | SQLite database file path. |
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
