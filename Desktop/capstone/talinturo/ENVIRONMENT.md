# Environment variables

Talinturo reads backend configuration from environment variables when Flask starts. Set them in the same terminal that runs the API. Unless noted otherwise, variables are optional for local development.

## Database

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | Unset | PostgreSQL connection URL. Learning content and progress endpoints require it. Restore `backend/talinturo.sql` into a new database, then apply `backend/talinturo_backend_migration.sql`. |
| `TALINTURO_DATABASE` | `backend/talinturo.sqlite3` | SQLite database file path for local authentication development and tests when `DATABASE_URL` is unset. |
| `PGHOST` | Driver default | PostgreSQL server host, when not specified in `DATABASE_URL`. |
| `PGPORT` | Driver default | PostgreSQL server port, when not specified in `DATABASE_URL`. |
| `PGDATABASE` | Driver default | PostgreSQL database name, when not specified in `DATABASE_URL`. |
| `PGUSER` | Driver default | PostgreSQL username, when not specified in `DATABASE_URL`. |
| `PGPASSWORD` | Unset | PostgreSQL password, when not specified in `DATABASE_URL`. Keep this secret and do not commit it. |

Example PowerShell setup for a local PostgreSQL server:

```powershell
$env:PGUSER = "postgres"
$env:PGPASSWORD = Read-Host "PostgreSQL password"
$env:DATABASE_URL = "postgresql://127.0.0.1:5432/talinturo"
```

The password is entered at the prompt rather than included in the connection URL. If your server uses different connection details, update the URL or the corresponding `PG*` variables.

## Flask and authentication

| Variable | Default | Description |
| --- | --- | --- |
| `TALINTURO_SECRET_KEY` | `local-development-key-change-before-deploy` | Signs Flask sessions and protects OAuth state. Set a strong, private value; the default is for local development only. |
| `TALINTURO_DEMO_MODE` | `false` | Enables optional local demo accounts and role switching. It does not seed PostgreSQL learning content. |
| `TALINTURO_COOKIE_SECURE` | `false` | Set to `true` when the backend is served over HTTPS. Leave `false` for local HTTP development. |
| `FLASK_DEBUG` | `false` | Enables Flask debug mode when set to `true`. Use only for local development. |

Generate a session key in PowerShell:

```powershell
$env:TALINTURO_SECRET_KEY = (python -c "import secrets; print(secrets.token_urlsafe(32))")
```

## Frontend and Google sign-in

| Variable | Default | Description |
| --- | --- | --- |
| `TALINTURO_FRONTEND_URL` | `http://127.0.0.1:5173` | Frontend URL used after Google sign-in. |
| `GOOGLE_CLIENT_ID` | Unset | Google OAuth client ID. Google sign-in is unavailable unless both Google credentials are configured. |
| `GOOGLE_CLIENT_SECRET` | Unset | Private Google OAuth client secret. Do not commit or share it. |
| `GOOGLE_REDIRECT_URI` | `http://127.0.0.1:5173/api/auth/google/callback` | OAuth callback URL. It must match the redirect URI registered with Google. |

Example Google OAuth configuration for local development:

```powershell
$env:GOOGLE_CLIENT_ID = "your-client-id"
$env:GOOGLE_CLIENT_SECRET = Read-Host "Google client secret"
$env:GOOGLE_REDIRECT_URI = "http://127.0.0.1:5173/api/auth/google/callback"
$env:TALINTURO_FRONTEND_URL = "http://127.0.0.1:5173"
$env:TALINTURO_SECRET_KEY = (python -c "import secrets; print(secrets.token_urlsafe(32))")
```

Register `http://127.0.0.1:5173` as the authorized JavaScript origin and the configured `GOOGLE_REDIRECT_URI` as the authorized redirect URI in Google Cloud Console. Restart Flask after changing these variables. Use the same hostname consistently: `localhost` and `127.0.0.1` are different OAuth origins. For deployment, use the deployed HTTPS frontend and callback URLs and route the callback path to Flask.

The login screen uses the OAuth `login` flow and expects an existing Talinturo account. The landing page and sign-up screen use the `signup` flow, which creates a learner account when the verified Google email is new. A verified Google address matching an existing Talinturo email is linked to that account.

## Security notes

- Never commit passwords, OAuth secrets, session keys, or a populated `.env` file.
- Values set with `$env:NAME = "value"` apply only to the current PowerShell session and its child processes.
- The backend does not automatically load a `.env` file. Configure environment variables in the process manager or terminal that starts Flask.
- `DATABASE_URL` selects PostgreSQL; it does not migrate or copy data from the SQLite database. It also does not generate sample content.
- The backend expects the schema in `backend/talinturo.sql` plus `backend/talinturo_backend_migration.sql`. Apply the migration before starting Flask; startup reports missing tables or columns.
- Before public deployment, disable demo mode, set a private session key, use HTTPS and secure cookies, and configure production access controls.

For installation and run instructions, see [SETUP.md](SETUP.md).
