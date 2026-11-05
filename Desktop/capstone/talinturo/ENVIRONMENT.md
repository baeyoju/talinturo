# Environment configuration

The backend loads the project-root `.env` file when it starts. The file is ignored by Git; keep credentials there, not in source code or `.env.example`. Copy the example for a fresh checkout:

```powershell
Copy-Item .env.example .env
notepad .env
```

The backend process environment takes precedence over values in `.env`, so deployment platforms can inject their own secrets.

## Database

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | Unset | PostgreSQL connection URL, including Supabase PostgreSQL. Learning content and progress endpoints require it. |
| `TALINTURO_DATABASE` | `backend/talinturo.sqlite3` | SQLite database file path when `DATABASE_URL` is unset. |
| `PGHOST` | Driver default | PostgreSQL server host, when not specified in `DATABASE_URL`. |
| `PGPORT` | Driver default | PostgreSQL server port, when not specified in `DATABASE_URL`. |
| `PGDATABASE` | Driver default | PostgreSQL database name, when not specified in `DATABASE_URL`. |
| `PGUSER` | Driver default | PostgreSQL username, when not specified in `DATABASE_URL`. |
| `PGPASSWORD` | Unset | Private PostgreSQL password, when not specified in `DATABASE_URL`. |

Set `DATABASE_URL` to enable PostgreSQL. For Supabase, copy the PostgreSQL connection URI from the project's **Connect** dialog and put it in `DATABASE_URL`. Use the database password from Supabase, not the Supabase project URL or anon/service-role API key. The existing Flask backend connects to PostgreSQL with `psycopg`, so no Supabase Python client or `SUPABASE_KEY` is needed. Keep the connection URI private; if the password contains reserved URL characters, URL-encode it.

The schema is in the project-root `talinturo_database.sql`; apply it to the Supabase database using its SQL Editor or `psql`. Applying it does not migrate an older schema or populate additional learning content.

## Flask and authentication

| Variable | Default | Description |
| --- | --- | --- |
| `TALINTURO_SECRET_KEY` | Random per process if unset | Private Flask session signing key. Set a stable value in `.env` so sessions survive backend restarts. |
| `TALINTURO_DEMO_MODE` | `false` | Enables optional local demo accounts and role switching. |
| `TALINTURO_COOKIE_SECURE` | `false` | Set to `true` when the backend is served over HTTPS. |
| `FLASK_DEBUG` | `false` | Enables Flask debug mode. Use only for local development. |

Generate a session key in PowerShell and paste the output into `TALINTURO_SECRET_KEY` in `.env`:

```powershell
.\backend\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Frontend and Google sign-in

| Variable | Default | Description |
| --- | --- | --- |
| `TALINTURO_FRONTEND_URL` | `http://127.0.0.1:5173` | Frontend URL used after Google sign-in. |
| `GOOGLE_CLIENT_ID` | Unset | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Unset | Private Google OAuth client secret. |
| `GOOGLE_REDIRECT_URI` | `http://127.0.0.1:5173/api/auth/google/callback` | OAuth callback URL registered with Google. |

Google sign-in is unavailable unless both OAuth credentials are set in `.env`. Register the frontend URL as the authorized JavaScript origin and the redirect URL as the authorized redirect URI. Use the same hostname consistently (`localhost` and `127.0.0.1` are different origins). Restart Flask after changing settings.

## Security notes

- Never commit `.env`, passwords, OAuth secrets, database credentials, or session keys.
- `.env.example` contains configuration names and safe defaults only. Put real values in `.env`.
- `DATABASE_URL` selects PostgreSQL; it does not migrate data from SQLite or generate sample content.
- Before public deployment, disable demo mode, set a private stable session key, use HTTPS and secure cookies, and configure production access controls.
- The Google OAuth client secret was previously embedded in source code. Treat it as exposed: rotate it in Google Cloud Console and place the replacement only in `.env`.

For installation and database setup, see [SETUP.md](SETUP.md).
