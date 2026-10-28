# Talinturo

Talinturo is a React and Flask learning app for Filipino Sign Language. The starter includes learner and instructor workspaces, lesson and vocabulary browsing, a scenario activity, a camera practice preview, progress and level challenges, profile/settings/help screens, and a local SQLite API.

## Run locally

Requirements: Node.js 18+ and Python 3.10+.

1. Start the API in a terminal:

   ```powershell
   cd backend
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python app.py
   ```

2. In another terminal, install and start the web app:

   ```powershell
   npm install
   npm run dev
   ```

3. Open the Vite URL printed in the terminal (normally `http://127.0.0.1:5173`).

Vite proxies `/api` requests to `http://127.0.0.1:5000`. The first API start creates `backend/talinturo.sqlite3` and seeds local demo content.

## Demo accounts

The interface opens in demo mode and automatically signs in to the learner demo. Use **Instructor view** in the top bar to switch demo roles.

| Role | Email | Password |
| --- | --- | --- |
| Learner | `learner@example.com` | `Talinturo2025!` |
| Instructor | `teacher@example.com` | `Talinturo2025!` |

Use the sign-in page to try the email/password flow. New accounts are stored in the local SQLite database with salted PBKDF2 password hashes.

## Current scope

- The camera feature is a local browser preview only. It does not record, upload, or recognize signs. No FSL recognition model is included.
- Google OAuth and password-reset email delivery require provider and mail-service configuration; the UI explains that these integrations are not enabled in the local demo.
- Seeded learner performance, lesson content, and scenario content are sample data for demonstrating the interface, not production learning records or authoritative FSL instruction. Learn from Deaf FSL signers and educators.
- Demo sign-in is enabled for local development. Before deployment, set `TALINTURO_DEMO_MODE=false`, configure a strong `TALINTURO_SECRET_KEY`, use HTTPS and secure cookies (`TALINTURO_COOKIE_SECURE=true`), and configure production CORS, authentication, account recovery, and privacy protections.

## Backend tests

Run the API tests from the project root:

```powershell
py -m unittest backend.test_app
```
