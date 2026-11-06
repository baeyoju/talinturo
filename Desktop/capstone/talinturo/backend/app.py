import hashlib
import hmac
import os
import re
import secrets
from datetime import date, timedelta
from functools import wraps
from pathlib import Path
from urllib.parse import urlsplit

from authlib.integrations.flask_client import OAuth
from dotenv import dotenv_values, load_dotenv
from flask import Flask, g, jsonify, redirect, request, session
from flask_cors import CORS

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

INTEGRITY_ERRORS = (psycopg.IntegrityError,)
BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR.parent / ".env"
load_dotenv(ENV_FILE)
FILE_DATABASE_URL = dotenv_values(ENV_FILE).get("DATABASE_URL")
DATABASE_URL = (
    FILE_DATABASE_URL if FILE_DATABASE_URL is not None else os.environ.get("DATABASE_URL", "")
).strip()
DEMO_MODE = os.environ.get("TALINTURO_DEMO_MODE", "false").lower() == "true"
USER_PK = "user_id"
PATH_PK = "path_id"
LESSON_PK = "lesson_id"
SIGN_PK = "sign_id"
ACTIVITY_PK = "activity_id"
ATTEMPT_PK = "attempt_id"
CLASSROOM_PK = "classroom_id"
MEMBERSHIP_PK = "membership_id"
ACHIEVEMENT_PK = "achievement_id"
LESSON_PUBLISHED_FILTER = "AND l.is_published = TRUE"
SINGLE_LESSON_PUBLISHED_FILTER = "AND is_published = TRUE"
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI", "http://127.0.0.1:5173/api/auth/google/callback"
)
FRONTEND_URL = os.environ.get("TALINTURO_FRONTEND_URL", "http://127.0.0.1:5173").rstrip("/")


class PostgresDatabase:
    def __init__(self, connection):
        self.connection = connection

    def execute(self, sql, params=()):
        return self.connection.execute(re.sub(r"\?", "%s", sql), params)

    def commit(self):
        self.connection.commit()

    def rollback(self):
        self.connection.rollback()

    def close(self):
        self.connection.close()


class GoogleAccountNotFound(ValueError):
    pass


class DatabaseConnectionError(RuntimeError):
    pass


app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get("TALINTURO_SECRET_KEY") or secrets.token_urlsafe(32),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("TALINTURO_COOKIE_SECURE", "false").lower() == "true",
)
oauth = OAuth(app)
google = oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)
CORS(
    app,
    origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    supports_credentials=True,
)


def get_db():
    if "db" not in g:
        try:
            connection = psycopg.connect(DATABASE_URL, row_factory=dict_row)
        except psycopg.OperationalError as error:
            raise DatabaseConnectionError(
                "Could not connect to PostgreSQL. Check DATABASE_URL or PGHOST, PGPORT, PGDATABASE, PGUSER, and PGPASSWORD."
            ) from error
        g.db = PostgresDatabase(connection)
    return g.db


def validate_media_url(value, label):
    url = str(value or "").strip()
    if len(url) > 2048:
        raise ValueError(f"{label} must be 2048 characters or fewer.")
    if url:
        parsed = urlsplit(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError(f"{label} must be an absolute HTTP or HTTPS URL.")
    return url or None


@app.errorhandler(DatabaseConnectionError)
def handle_database_connection_error(_error):
    return (
        jsonify(
            {
                "error": "The PostgreSQL database is unavailable. Check DATABASE_URL or the PG* connection settings, then restart Flask.",
                "missing_data": [
                    {
                        "table": "PostgreSQL connection settings",
                        "records": "Set DATABASE_URL or configure PGHOST, PGPORT, PGDATABASE, PGUSER, and PGPASSWORD in the backend environment.",
                    }
                ],
            }
        ),
        503,
    )


@app.teardown_appcontext
def close_db(_error=None):
    database = g.pop("db", None)
    if database is not None:
        database.close()


def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310_000)
    return salt.hex(), digest.hex()


def stored_password_values(salt, password_hash):
    return salt, password_hash


def insert_id(db, sql, params, id_column="id"):
    return db.execute(f"{sql} RETURNING {id_column}", params).fetchone()[id_column]


def require_postgres_schema(db):
    required_tables = {
        "users",
        "oauth_accounts",
        "classrooms",
        "classroom_memberships",
        "learning_paths",
        "lessons",
        "activities",
        "signs",
        "activity_attempts",
        "lesson_progress",
        "achievements",
        "user_achievements",
        "user_preferences",
        "sign_favorites",
    }
    rows = db.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    ).fetchall()
    existing_tables = {row["table_name"] for row in rows}
    missing_tables = sorted(required_tables - existing_tables)
    if missing_tables:
        raise RuntimeError(
            "The PostgreSQL public schema is missing required tables: "
            f"{', '.join(missing_tables)}. Restore talinturo.sql before "
            "starting the API."
        )
    required_columns = {
        "users": {"user_id", "name", "email", "password_salt", "password_hash", "role", "learner_type", "learning_goal", "is_active", "updated_at"},
        "oauth_accounts": {"provider", "subject", "user_id"},
        "user_preferences": {"user_id", "theme_mode", "sound", "reduced_motion", "weekly_summary"},
        "classrooms": {"classroom_id", "instructor_id", "name", "invite_code", "is_active", "created_at"},
        "classroom_memberships": {"membership_id", "classroom_id", "user_id", "invited_email", "status", "joined_at"},
        "learning_paths": {"path_id", "slug", "title", "description", "level", "is_published"},
        "lessons": {"lesson_id", "path_id", "slug", "title", "description", "duration_minutes", "content", "image_url", "video_url", "is_published"},
        "activities": {"activity_id", "path_id", "slug", "activity_type", "title", "content", "is_published"},
        "signs": {"sign_id", "lesson_id", "slug", "word", "meaning", "category", "hint", "media_url", "is_published"},
        "activity_attempts": {"attempt_id", "activity_id", "user_id", "score", "status", "response", "completed_at"},
        "lesson_progress": {"user_id", "lesson_id", "progress_percent", "updated_at"},
        "achievements": {"achievement_id", "slug", "title", "description", "criteria"},
        "user_achievements": {"user_id", "achievement_id", "earned_at", "is_published"},
        "sign_favorites": {"user_id", "sign_id"},
    }
    column_rows = db.execute(
        "SELECT table_name, column_name FROM information_schema.columns "
        "WHERE table_schema = 'public'"
    ).fetchall()
    existing_columns = {}
    for row in column_rows:
        existing_columns.setdefault(row["table_name"], set()).add(row["column_name"])
    missing_columns = [
        f"{table}.{column}"
        for table, columns in required_columns.items()
        for column in sorted(columns - existing_columns.get(table, set()))
    ]
    if missing_columns:
        raise RuntimeError(
            "The PostgreSQL schema is missing required columns: "
            f"{', '.join(missing_columns)}. Restore the current talinturo.sql "
            "schema before starting the API."
        )
    duration_type = db.execute(
        "SELECT data_type FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'duration_minutes'"
    ).fetchone()
    if duration_type and duration_type["data_type"] not in ("text", "character varying"):
        raise RuntimeError(
            "lessons.duration_minutes must use the M:SS text format. "
            "Apply migrations/002_lesson_duration_mmss.sql to the PostgreSQL database."
        )


def initialize_database():
    with app.app_context():
        db = get_db()
        require_postgres_schema(db)


def json_error(message, status):
    return jsonify({"error": message}), status


def postgres_missing_records(db, table_queries):
    missing = []
    for table, query, parameters, message in table_queries:
        count = db.execute(query, parameters).fetchone()["total"]
        if count == 0:
            missing.append({"table": table, "records": message})
    return missing


def activity_streak(db, user_id):
    rows = db.execute(
        """
        SELECT active_date
        FROM (
            SELECT completed_at::date AS active_date
            FROM activity_attempts
            WHERE user_id = ? AND status = 'completed'
              AND completed_at >= CURRENT_DATE - INTERVAL '365 days'
            UNION
            SELECT updated_at::date AS active_date
            FROM lesson_progress
            WHERE user_id = ? AND progress_percent >= 100
              AND updated_at >= CURRENT_DATE - INTERVAL '365 days'
        ) recent_activity
        ORDER BY active_date DESC
        """,
        (user_id, user_id),
    ).fetchall()
    active_dates = {row["active_date"] for row in rows}
    current_day = date.today()
    if current_day not in active_dates:
        current_day -= timedelta(days=1)
    streak = 0
    while current_day in active_dates:
        streak += 1
        current_day -= timedelta(days=1)
    return streak


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return json_error("Please sign in to continue.", 401)
        account = get_db().execute(
            "SELECT is_active FROM users WHERE user_id = ?", (session["user_id"],)
        ).fetchone()
        if account is None or not account["is_active"]:
            session.clear()
            return json_error("This account is inactive. Contact your Talinturo administrator.", 403)
        return view(*args, **kwargs)

    return wrapped


def instructor_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return json_error("Please sign in to continue.", 401)
        account = get_db().execute(
            "SELECT is_active FROM users WHERE user_id = ?", (session["user_id"],)
        ).fetchone()
        if account is None or not account["is_active"]:
            session.clear()
            return json_error("This account is inactive. Contact your Talinturo administrator.", 403)
        if session.get("role") != "instructor":
            return json_error("Instructor access is required.", 403)
        return view(*args, **kwargs)

    return wrapped


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return json_error("Please sign in to continue.", 401)
        account = get_db().execute(
            "SELECT is_active FROM users WHERE user_id = ?", (session["user_id"],)
        ).fetchone()
        if account is None or not account["is_active"]:
            session.clear()
            return json_error("This account is inactive. Contact your Talinturo administrator.", 403)
        if session.get("role") != "admin":
            return json_error("Administrator access is required.", 403)
        return view(*args, **kwargs)

    return wrapped


def public_user(row):
    return {
        "id": row[USER_PK],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "learner_type": row["learner_type"] or "Adult learner",
        "learning_goal": row["learning_goal"] or "Everyday conversations",
        "created_at": row["created_at"],
    }


def get_or_create_google_user(userinfo, allow_signup=True):
    subject = str(userinfo.get("sub", "")).strip()
    email = str(userinfo.get("email", "")).strip().lower()
    if not subject or not email or userinfo.get("email_verified") is not True:
        raise ValueError("Google did not provide a verified account email.")

    db = get_db()
    linked_user = db.execute(
        f"""SELECT users.* FROM users
           JOIN oauth_accounts ON oauth_accounts.user_id = users.{USER_PK}
           WHERE oauth_accounts.provider = ? AND oauth_accounts.subject = ?""",
        ("google", subject),
    ).fetchone()
    if linked_user is not None:
        return linked_user

    user = db.execute("SELECT * FROM users WHERE lower(email) = ?", (email,)).fetchone()
    if user is None:
        if not allow_signup:
            raise GoogleAccountNotFound(
                "No account is registered for this Google email. Create an account first."
            )
        salt, password_hash = hash_password(secrets.token_urlsafe(48))
        salt, password_hash = stored_password_values(salt, password_hash)
        name = str(userinfo.get("name", "Google learner")).strip()[:70] or "Google learner"
        user_id = insert_id(
            db,
            "INSERT INTO users(name, email, password_salt, password_hash) VALUES(?, ?, ?, ?)",
            (name, email, salt, password_hash),
            USER_PK,
        )
        user = db.execute(f"SELECT * FROM users WHERE {USER_PK} = ?", (user_id,)).fetchone()

    db.execute(
        "INSERT INTO oauth_accounts(provider, subject, user_id) VALUES(?, ?, ?)",
        ("google", subject, user[USER_PK]),
    )
    db.commit()
    return user


@app.get("/")
def home():
    return jsonify({"success": True, "message": "Talinturo API is running."})


@app.get("/api/health")
def health():
    try:
        get_db().execute("SELECT 1")
    except Exception:
        app.logger.exception("Database health check failed")
        return json_error("The API database is unavailable.", 503)
    return jsonify({"success": True, "message": "Talinturo API is healthy."})


@app.get("/api/auth/google")
def google_login():
    flow = request.args.get("flow", "login")
    if flow not in ("login", "signup"):
        return redirect(f"{FRONTEND_URL}/login?oauth_error=invalid_flow")
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        route = "signup" if flow == "signup" else "login"
        return redirect(f"{FRONTEND_URL}/{route}?oauth_error=not_configured")
    session["oauth_flow"] = flow
    try:
        return google.authorize_redirect(GOOGLE_REDIRECT_URI)
    except Exception:
        app.logger.exception("Could not start Google OAuth")
        route = "signup" if flow == "signup" else "login"
        return redirect(f"{FRONTEND_URL}/{route}?oauth_error=start_failed")


@app.get("/api/auth/google/callback")
def google_callback():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return redirect(f"{FRONTEND_URL}/login?oauth_error=not_configured")
    flow = session.pop("oauth_flow", "login")
    if flow not in ("login", "signup"):
        flow = "login"
    if request.args.get("error") == "access_denied":
        route = "signup" if flow == "signup" else "login"
        return redirect(f"{FRONTEND_URL}/{route}?oauth_error=cancelled")
    try:
        token = google.authorize_access_token()
        userinfo = token.get("userinfo") or google.userinfo()
        user = get_or_create_google_user(userinfo, allow_signup=flow == "signup")
    except GoogleAccountNotFound as error:
        app.logger.info("Google authentication was rejected: %s", error)
        route = "signup" if flow == "signup" else "login"
        return redirect(f"{FRONTEND_URL}/{route}?oauth_error=account_not_found")
    except ValueError as error:
        app.logger.info("Google authentication was rejected: %s", error)
        route = "signup" if flow == "signup" else "login"
        return redirect(f"{FRONTEND_URL}/{route}?oauth_error=account_unavailable")
    except Exception:
        app.logger.exception("Google sign-in failed")
        route = "signup" if flow == "signup" else "login"
        return redirect(f"{FRONTEND_URL}/{route}?oauth_error=callback_failed")

    session.clear()
    session["user_id"] = user[USER_PK]
    session["role"] = user["role"]
    if flow == "signup":
        return redirect(f"{FRONTEND_URL}/profile/setup")
    destination = "/admin" if user["role"] == "admin" else "/instructor" if user["role"] == "instructor" else "/"
    return redirect(f"{FRONTEND_URL}{destination}")


@app.post("/api/auth/demo")
def demo_login():
    if not DEMO_MODE:
        return json_error("Demo sign-in is disabled.", 404)
    data = request.get_json(silent=True) or {}
    role = data.get("role", "learner")
    if role not in ("learner", "instructor"):
        return json_error("Choose a valid demo role.", 400)
    email = "teacher@example.com" if role == "instructor" else "learner@example.com"
    user = get_db().execute("SELECT * FROM users WHERE lower(email) = ?", (email,)).fetchone()
    if user is None:
        return json_error("No demo account is provisioned in this database.", 404)
    session.clear()
    session["user_id"] = user[USER_PK]
    session["role"] = role
    return jsonify({"user": public_user(user)})


@app.post("/api/auth/signup")
def signup():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if not name or len(name) > 70:
        return json_error("Enter a name between 1 and 70 characters.", 400)
    if len(email) > 254 or "@" not in email:
        return json_error("Enter a valid email address.", 400)
    if len(password) < 8 or len(password) > 128:
        return json_error("Your password must be between 8 and 128 characters.", 400)
    salt, password_hash = hash_password(password)
    salt, password_hash = stored_password_values(salt, password_hash)
    db = get_db()
    try:
        user_id = insert_id(
            db,
            "INSERT INTO users(name, email, password_salt, password_hash) VALUES(?, ?, ?, ?)",
            (name, email, salt, password_hash),
            USER_PK,
        )
        db.commit()
    except INTEGRITY_ERRORS:
        return json_error("An account already exists for that email.", 409)
    session.clear()
    session["user_id"] = user_id
    session["role"] = "learner"
    user = db.execute(f"SELECT * FROM users WHERE {USER_PK} = ?", (user_id,)).fetchone()
    return jsonify({"user": public_user(user)}), 201


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    expected_role = data.get("expected_role")
    if expected_role is not None and expected_role not in ("learner", "instructor", "admin"):
        return json_error("Choose a valid account type.", 400)
    user = get_db().execute("SELECT * FROM users WHERE lower(email) = ?", (email,)).fetchone()
    if user is None or user["password_salt"] is None or user["password_hash"] is None:
        return json_error("Email or password is incorrect.", 401)
    salt_value = user["password_salt"]
    salt = bytes(salt_value) if isinstance(salt_value, (bytes, bytearray, memoryview)) else bytes.fromhex(salt_value)
    _, supplied_hash = hash_password(password, salt)
    stored_hash = user["password_hash"]
    if isinstance(stored_hash, (bytes, bytearray, memoryview)):
        supplied_hash = bytes.fromhex(supplied_hash)
    if not hmac.compare_digest(supplied_hash, stored_hash):
        return json_error("Email or password is incorrect.", 401)
    if expected_role and user["role"] != expected_role:
        return json_error("This sign-in is for a different account type.", 403)
    if not user["is_active"]:
        return json_error("This account is inactive. Contact your Talinturo administrator.", 403)
    session.clear()
    session["user_id"] = user[USER_PK]
    session["role"] = user["role"]
    return jsonify({"user": public_user(user)})


@app.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify({"success": True})


@app.get("/api/auth/me")
@login_required
def current_user():
    user = get_db().execute(
        f"SELECT * FROM users WHERE {USER_PK} = ?", (session["user_id"],)
    ).fetchone()
    return jsonify({"user": public_user(user), "demo_mode": DEMO_MODE})


@app.get("/api/admin/overview")
@admin_required
def admin_overview():
    db = get_db()
    counts = {
        "learners": "SELECT COUNT(*) AS total FROM users WHERE role = 'learner'",
        "instructors": "SELECT COUNT(*) AS total FROM users WHERE role = 'instructor'",
        "active_accounts": "SELECT COUNT(*) AS total FROM users WHERE is_active = TRUE",
        "paths": "SELECT COUNT(*) AS total FROM learning_paths",
        "published_paths": "SELECT COUNT(*) AS total FROM learning_paths WHERE is_published = TRUE",
        "lessons": "SELECT COUNT(*) AS total FROM lessons",
        "published_lessons": "SELECT COUNT(*) AS total FROM lessons WHERE is_published = TRUE",
        "classrooms": "SELECT COUNT(*) AS total FROM classrooms WHERE is_active = TRUE",
    }
    return jsonify({"overview": {key: db.execute(sql).fetchone()["total"] for key, sql in counts.items()}})


@app.get("/api/admin/accounts")
@admin_required
def admin_accounts():
    rows = get_db().execute(
        "SELECT user_id AS id, name, email, role, is_active, created_at "
        "FROM users ORDER BY created_at DESC, user_id DESC"
    ).fetchall()
    return jsonify({"accounts": [dict(row) for row in rows]})


@app.post("/api/admin/accounts")
@admin_required
def admin_create_account():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    role = data.get("role")
    if not name or len(name) > 70:
        return json_error("Enter a name between 1 and 70 characters.", 400)
    if len(email) > 254 or "@" not in email:
        return json_error("Enter a valid email address.", 400)
    if len(password) < 8 or len(password) > 128:
        return json_error("The password must be between 8 and 128 characters.", 400)
    if role not in ("learner", "instructor"):
        return json_error("Choose learner or instructor for the new account.", 400)
    salt, password_hash = hash_password(password)
    db = get_db()
    try:
        user_id = insert_id(
            db,
            "INSERT INTO users(name, email, password_salt, password_hash, role) VALUES(?, ?, ?, ?, ?)",
            (name, email, salt, password_hash, role),
            USER_PK,
        )
        db.commit()
    except INTEGRITY_ERRORS:
        db.rollback()
        return json_error("An account already exists for that email.", 409)
    user = db.execute(
        "SELECT user_id AS id, name, email, role, is_active, created_at FROM users WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    return jsonify({"account": dict(user)}), 201


@app.patch("/api/admin/accounts/<int:user_id>/status")
@admin_required
def admin_update_account_status(user_id):
    active = (request.get_json(silent=True) or {}).get("is_active")
    if not isinstance(active, bool):
        return json_error("Account status must be active or inactive.", 400)
    if user_id == session["user_id"] and not active:
        return json_error("You cannot deactivate your own admin account.", 400)
    db = get_db()
    row = db.execute(
        "UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP "
        "WHERE user_id = ? RETURNING user_id AS id, name, email, role, is_active, created_at",
        (active, user_id),
    ).fetchone()
    if row is None:
        return json_error("Account not found.", 404)
    db.commit()
    return jsonify({"account": dict(row)})


@app.get("/api/admin/content")
@admin_required
def admin_content():
    rows = get_db().execute(
        "SELECT p.path_id AS id, p.slug, p.title, p.description, p.level, p.is_published, "
        "p.created_at, COUNT(l.lesson_id) AS lesson_count "
        "FROM learning_paths p LEFT JOIN lessons l ON l.path_id = p.path_id "
        "GROUP BY p.path_id ORDER BY p.path_id DESC"
    ).fetchall()
    lessons = get_db().execute(
        "SELECT l.lesson_id AS id, l.path_id, l.slug, l.title, l.description, "
        "l.duration_minutes, l.content, l.image_url, l.video_url, l.is_published, p.title AS path_title "
        "FROM lessons l JOIN learning_paths p ON p.path_id = l.path_id "
        "ORDER BY l.path_id, l.lesson_id"
    ).fetchall()
    return jsonify({"paths": [dict(row) for row in rows], "lessons": [dict(row) for row in lessons]})


@app.post("/api/admin/paths")
@admin_required
def admin_create_path():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()
    level = str(data.get("level", "Beginner")).strip()
    slug = re.sub(r"[^a-z0-9]+", "-", str(data.get("slug") or title).lower()).strip("-")
    if not title or len(title) > 200 or not slug or len(slug) > 120:
        return json_error("Enter a valid learning path title and slug.", 400)
    if not level or len(level) > 60:
        return json_error("Enter a learning level up to 60 characters.", 400)
    published = data.get("is_published", False)
    if not isinstance(published, bool):
        return json_error("Publish status must be true or false.", 400)
    db = get_db()
    try:
        path_id = insert_id(
            db,
            "INSERT INTO learning_paths(slug, title, description, level, is_published) VALUES(?, ?, ?, ?, ?)",
            (slug, title, description, level, published),
            PATH_PK,
        )
        db.commit()
    except INTEGRITY_ERRORS:
        db.rollback()
        return json_error("A learning path already uses that slug.", 409)
    return jsonify({"id": path_id, "slug": slug, "title": title, "is_published": published}), 201


@app.patch("/api/admin/paths/<int:path_id>")
@admin_required
def admin_update_path(path_id):
    data = request.get_json(silent=True) or {}
    published = data.get("is_published")
    if not isinstance(published, bool):
        return json_error("Publish status must be true or false.", 400)
    row = get_db().execute(
        "UPDATE learning_paths SET is_published = ?, updated_at = CURRENT_TIMESTAMP "
        "WHERE path_id = ? RETURNING path_id AS id, is_published",
        (published, path_id),
    ).fetchone()
    if row is None:
        return json_error("Learning path not found.", 404)
    get_db().commit()
    return jsonify({"path": dict(row)})


@app.post("/api/admin/paths/<int:path_id>/lessons")
@admin_required
def admin_create_lesson(path_id):
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()
    slug = re.sub(r"[^a-z0-9]+", "-", str(data.get("slug") or title).lower()).strip("-")
    duration = data.get("duration_minutes", "5:00")
    content = data.get("content")
    image_url = data.get("image_url", "")
    video_url = data.get("video_url", "")
    published = data.get("is_published", False)
    if not title or len(title) > 200 or not slug or len(slug) > 120:
        return json_error("Enter a valid lesson title and slug.", 400)
    if isinstance(duration, int) and not isinstance(duration, bool):
        duration = f"{duration}:00"
    if not isinstance(duration, str) or not re.fullmatch(r"\d+:[0-5]\d", duration):
        return json_error("Lesson duration must use M:SS format, such as 3:36.", 400)
    minutes_text, seconds_text = duration.split(":")
    minutes_text = minutes_text.lstrip("0") or "0"
    if len(minutes_text) > 3 or int(minutes_text) * 60 + int(seconds_text) > 600 * 60:
        return json_error("Lesson duration cannot exceed 600 minutes.", 400)
    if not isinstance(content, dict):
        return json_error("Lesson content must be a JSON object.", 400)
    if not isinstance(published, bool):
        return json_error("Publish status must be true or false.", 400)
    try:
        image_url = validate_media_url(image_url, "Image URL")
        video_url = validate_media_url(video_url, "Video URL")
        captions_url = validate_media_url(data.get("captions_url", ""), "Captions URL")
    except ValueError as error:
        return json_error(str(error), 400)
    content = dict(content)
    transcript = str(data.get("transcript", "")).strip()
    if captions_url:
        content["captions_url"] = captions_url
    else:
        content.pop("captions_url", None)
    if transcript:
        content["transcript"] = transcript
    else:
        content.pop("transcript", None)
    if not content.get("sections") and not video_url:
        return json_error("Add lesson sections or a video URL before saving.", 400)
    db = get_db()
    if db.execute("SELECT 1 FROM learning_paths WHERE path_id = ?", (path_id,)).fetchone() is None:
        return json_error("Learning path not found.", 404)
    try:
        lesson_id = insert_id(
            db,
            "INSERT INTO lessons(path_id, slug, title, description, duration_minutes, content, image_url, video_url, is_published) "
            "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (path_id, slug, title, description, duration, Jsonb(content), image_url, video_url, published),
            LESSON_PK,
        )
        db.commit()
    except INTEGRITY_ERRORS:
        db.rollback()
        return json_error("A lesson already uses that slug.", 409)
    return jsonify({"id": lesson_id, "path_id": path_id, "title": title, "is_published": published}), 201


@app.patch("/api/admin/lessons/<int:lesson_id>")
@admin_required
def admin_update_lesson(lesson_id):
    data = request.get_json(silent=True) or {}
    db = get_db()
    updates = []
    values = []
    if "is_published" in data:
        if not isinstance(data["is_published"], bool):
            return json_error("Publish status must be true or false.", 400)
        updates.append("is_published = ?")
        values.append(data["is_published"])
    if any(key in data for key in ("image_url", "video_url", "captions_url", "transcript")):
        current = db.execute("SELECT content FROM lessons WHERE lesson_id = ?", (lesson_id,)).fetchone()
        if current is None:
            return json_error("Lesson not found.", 404)
        content = dict(current["content"] or {})
        try:
            if "image_url" in data:
                updates.append("image_url = ?")
                values.append(validate_media_url(data["image_url"], "Image URL"))
            if "video_url" in data:
                updates.append("video_url = ?")
                values.append(validate_media_url(data["video_url"], "Video URL"))
            if "captions_url" in data:
                captions_url = validate_media_url(data["captions_url"], "Captions URL")
                if captions_url:
                    content["captions_url"] = captions_url
                else:
                    content.pop("captions_url", None)
            if "transcript" in data:
                transcript = str(data["transcript"] or "").strip()
                if transcript:
                    content["transcript"] = transcript
                else:
                    content.pop("transcript", None)
        except ValueError as error:
            return json_error(str(error), 400)
        if "captions_url" in data or "transcript" in data:
            updates.append("content = ?")
            values.append(Jsonb(content))
    if not updates:
        return json_error("No lesson changes were provided.", 400)
    values.append(lesson_id)
    row = db.execute(
        f"UPDATE lessons SET {', '.join(updates)} WHERE lesson_id = ? "
        "RETURNING lesson_id AS id, is_published, image_url, video_url, content",
        values,
    ).fetchone()
    if row is None:
        return json_error("Lesson not found.", 404)
    db.commit()
    return jsonify({"lesson": dict(row)})


@app.get("/api/preferences")
@login_required
def preferences():
    db = get_db()
    db.execute(
        "INSERT INTO user_preferences(user_id) VALUES(?) ON CONFLICT(user_id) DO NOTHING",
        (session["user_id"],),
    )
    db.commit()
    row = db.execute(
        "SELECT theme_mode, sound, reduced_motion, weekly_summary "
        "FROM user_preferences WHERE user_id = ?",
        (session["user_id"],),
    ).fetchone()
    return jsonify({"preferences": dict(row)})


@app.put("/api/preferences")
@login_required
def update_preferences():
    data = request.get_json(silent=True) or {}
    theme_mode = data.get("theme_mode")
    boolean_fields = ("sound", "reduced_motion", "weekly_summary")
    if theme_mode not in ("light", "dark"):
        return json_error("Theme mode must be light or dark.", 400)
    if any(not isinstance(data.get(field), bool) for field in boolean_fields):
        return json_error("All preference toggles must be true or false.", 400)

    db = get_db()
    db.execute(
        """
        INSERT INTO user_preferences
            (user_id, theme_mode, sound, reduced_motion, weekly_summary, updated_at)
        VALUES(?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            theme_mode = excluded.theme_mode,
            sound = excluded.sound,
            reduced_motion = excluded.reduced_motion,
            weekly_summary = excluded.weekly_summary,
            updated_at = CURRENT_TIMESTAMP
        """,
        (
            session["user_id"],
            theme_mode,
            data["sound"],
            data["reduced_motion"],
            data["weekly_summary"],
        ),
    )
    db.commit()
    row = db.execute(
        "SELECT theme_mode, sound, reduced_motion, weekly_summary "
        "FROM user_preferences WHERE user_id = ?",
        (session["user_id"],),
    ).fetchone()
    return jsonify({"preferences": dict(row)})


@app.get("/api/dashboard")
@login_required
def dashboard():
    db = get_db()
    user_id = session["user_id"]
    lesson_publish_filter = "AND l.is_published = TRUE"
    events = db.execute(
        f"""
        SELECT COUNT(*) AS activities_completed,
               ROUND(AVG(aa.score))::INTEGER AS average_score
        FROM activity_attempts aa
        JOIN activities a ON a.{ACTIVITY_PK} = aa.activity_id
        WHERE aa.user_id = ? AND aa.status = 'completed'
        """,
        (user_id,),
    ).fetchone()
    if session["role"] == "instructor":
        lessons_completed = db.execute(
            f"""
            SELECT COUNT(*) AS total
            FROM (
                SELECT DISTINCT lp.user_id, lp.lesson_id
                FROM lesson_progress lp
                JOIN classroom_memberships cm
                  ON cm.user_id = lp.user_id AND cm.status = 'active'
                JOIN classrooms c
                  ON c.{CLASSROOM_PK} = cm.classroom_id AND c.is_active = TRUE
                WHERE c.instructor_id = ? AND lp.progress_percent >= 100
            ) completed_lessons
            """,
            (user_id,),
        ).fetchone()["total"]
    else:
        lessons_completed = db.execute(
            "SELECT COUNT(*) AS total FROM lesson_progress "
            "WHERE user_id = ? AND progress_percent >= 100",
            (user_id,),
        ).fetchone()["total"]
    classrooms = db.execute(
        "SELECT COUNT(*) AS total FROM classrooms WHERE instructor_id = ? AND is_active = TRUE",
        (user_id,),
    ).fetchone()
    next_lesson = db.execute(
        f"""
        SELECT l.{LESSON_PK} AS id, l.title, l.duration_minutes, p.{PATH_PK} AS path_id,
               p.title AS path_title, p.level,
               COALESCE(lp.progress_percent, 0) AS progress
        FROM lessons l
        JOIN learning_paths p ON p.{PATH_PK} = l.path_id AND p.is_published = TRUE
        LEFT JOIN lesson_progress lp ON lp.lesson_id = l.{LESSON_PK} AND lp.user_id = ?
        WHERE COALESCE(lp.progress_percent, 0) < 100 {lesson_publish_filter}
        ORDER BY p.{PATH_PK}, l.{LESSON_PK}
        LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    featured_paths = db.execute(
        f"""
        SELECT p.{PATH_PK} AS id, p.title, p.description, p.level,
               COUNT(DISTINCT l.{LESSON_PK}) AS lessons,
               COALESCE(ROUND(AVG(lp.progress_percent))::INTEGER, 0) AS progress
        FROM learning_paths p
        LEFT JOIN lessons l ON l.path_id = p.{PATH_PK} AND l.is_published = TRUE
        LEFT JOIN lesson_progress lp ON lp.lesson_id = l.{LESSON_PK} AND lp.user_id = ?
        WHERE p.is_published = TRUE
        GROUP BY p.{PATH_PK}
        ORDER BY p.{PATH_PK}
        LIMIT 2
        """,
        (user_id,),
    ).fetchall()
    return jsonify(
        {
            "role": session["role"],
            "activities_completed": events["activities_completed"],
            "lessons_completed": lessons_completed,
            "average_score": events["average_score"],
            "learning_streak": activity_streak(db, user_id),
            "classrooms": classrooms["total"],
            "next_lesson": dict(next_lesson) if next_lesson else None,
            "featured_paths": [dict(row) for row in featured_paths],
        }
    )


@app.get("/api/data/readiness")
@login_required
def data_readiness():
    db = get_db()
    requirements = [
        (
            "learning_paths",
            "SELECT COUNT(*) AS total FROM learning_paths WHERE is_published = TRUE",
            (),
            "Add at least one published learning path with a title and level.",
        ),
        (
            "lessons",
            "SELECT COUNT(*) AS total FROM lessons l "
            "JOIN learning_paths p ON p.path_id = l.path_id AND p.is_published = TRUE "
            "WHERE l.is_published = TRUE AND CASE WHEN jsonb_typeof(l.content->'sections') = 'array' "
            "THEN jsonb_array_length(l.content->'sections') > 0 ELSE FALSE END",
            (),
            "Add lessons linked to a published learning path, with title, duration, and a content.sections array.",
        ),
        (
            "signs",
            "SELECT COUNT(*) AS total FROM signs WHERE is_published = TRUE",
            (),
            "Add published vocabulary signs with a word, meaning, category, and optional hint/media URL.",
        ),
        (
            "activities",
            "SELECT COUNT(*) AS total FROM activities WHERE is_published = TRUE "
            "AND activity_type = 'scenario' "
            "AND CASE WHEN jsonb_typeof(content->'questions') = 'array' "
            "THEN jsonb_array_length(content->'questions') > 0 ELSE FALSE END",
            (),
            "Add published scenario activities. Store each prompt, choices, correct answer, and feedback in its JSONB content.",
        ),
        (
            "activities",
            "SELECT COUNT(*) AS total FROM activities WHERE is_published = TRUE "
            "AND activity_type = 'challenge' "
            "AND CASE WHEN jsonb_typeof(content->'questions') = 'array' "
            "THEN jsonb_array_length(content->'questions') > 0 ELSE FALSE END",
            (),
            "Add published challenge activities with questions and answer choices in JSONB content.",
        ),
        (
            "activities",
            "SELECT COUNT(*) AS total FROM activities WHERE is_published = TRUE "
            "AND activity_type = 'practice' "
            "AND CASE WHEN jsonb_typeof(content->'steps') = 'array' "
            "THEN jsonb_array_length(content->'steps') > 0 ELSE FALSE END",
            (),
            "Add published practice activities with word, meaning, and sign-guidance steps in JSONB content.",
        ),
        (
            "achievements",
            "SELECT COUNT(*) AS total FROM achievements",
            (),
            "Add achievement definitions with a name, description, and unlock criteria.",
        ),
    ]
    return jsonify(
        {
            "database": "postgresql",
            "missing_data": postgres_missing_records(db, requirements),
            "requirements": [
                {"table": table, "records": message}
                for table, _query, _parameters, message in requirements
            ],
        }
    )


@app.get("/api/paths")
@login_required
def learning_paths():
    rows = get_db().execute(
        f"""
        SELECT p.{PATH_PK} AS id, p.title, p.description, p.level,
               COUNT(DISTINCT l.{LESSON_PK}) AS lessons,
               COALESCE(ROUND(AVG(lp.progress_percent))::INTEGER, 0) AS progress
        FROM learning_paths p
        LEFT JOIN lessons l ON l.path_id = p.{PATH_PK} AND l.is_published = TRUE
        LEFT JOIN lesson_progress lp
          ON lp.lesson_id = l.{LESSON_PK} AND lp.user_id = ?
        WHERE p.is_published = TRUE
        GROUP BY p.{PATH_PK}
        ORDER BY p.{PATH_PK}
        """,
        (session["user_id"],),
    ).fetchall()
    return jsonify({"paths": [dict(row) for row in rows]})


@app.get("/api/paths/<int:path_id>")
@login_required
def learning_path_detail(path_id):
    db = get_db()
    path = db.execute(
        f"SELECT {PATH_PK} AS id, title, description, level FROM learning_paths "
        f"WHERE {PATH_PK} = ? AND is_published = TRUE",
        (path_id,),
    ).fetchone()
    if path is None:
        return json_error("This learning path is not available.", 404)
    lessons = db.execute(
        f"""
        SELECT l.{LESSON_PK} AS id, l.title, l.duration_minutes, l.content,
               l.image_url, l.video_url,
               COALESCE(lp.progress_percent, 0) AS progress
        FROM lessons l
        LEFT JOIN lesson_progress lp
          ON lp.lesson_id = l.{LESSON_PK} AND lp.user_id = ?
        WHERE l.path_id = ? {LESSON_PUBLISHED_FILTER}
        ORDER BY l.{LESSON_PK}
        """,
        (session["user_id"], path_id),
    ).fetchall()
    return jsonify({"path": dict(path), "lessons": [dict(row) for row in lessons]})


@app.post("/api/lessons/<int:lesson_id>/complete")
@login_required
def complete_lesson(lesson_id):
    db = get_db()
    lesson = db.execute(
        f"""
        SELECT l.{LESSON_PK} AS id, l.title, l.content, l.video_url
        FROM lessons l
        JOIN learning_paths p ON p.{PATH_PK} = l.path_id AND p.is_published = TRUE
        WHERE l.{LESSON_PK} = ? {SINGLE_LESSON_PUBLISHED_FILTER}
        """,
        (lesson_id,),
    ).fetchone()
    if lesson is None:
        return json_error("This lesson is not available.", 404)
    if not lesson["video_url"] and (
        not isinstance(lesson["content"], dict) or not lesson["content"].get("sections")
    ):
        return (
            jsonify(
                {
                    "error": "This lesson has no published lesson material.",
                    "missing_data": [
                        {
                            "table": "lessons.content",
                            "records": "Add a video_url or a sections array with titled lesson content before marking this lesson complete.",
                        }
                    ],
                }
            ),
            409,
        )
    db.execute(
        """
        INSERT INTO lesson_progress
            (user_id, lesson_id, status, progress_percent, started_at, completed_at, updated_at)
        VALUES(?, ?, 'completed', 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, lesson_id)
        DO UPDATE SET progress_percent = 100, status = 'completed',
                      completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        """,
        (session["user_id"], lesson_id),
    )
    db.commit()
    return jsonify({"success": True, "lesson_id": lesson_id, "progress": 100})


@app.get("/api/lessons/<int:lesson_id>")
@login_required
def lesson_detail(lesson_id):
    row = get_db().execute(
        f"""
        SELECT l.{LESSON_PK} AS id, l.path_id, l.title, l.description,
               l.duration_minutes, l.content, l.image_url, l.video_url,
               p.title AS path_title, COALESCE(lp.progress_percent, 0) AS progress
        FROM lessons l
        JOIN learning_paths p ON p.{PATH_PK} = l.path_id AND p.is_published = TRUE
        LEFT JOIN lesson_progress lp
          ON lp.lesson_id = l.{LESSON_PK} AND lp.user_id = ?
        WHERE l.{LESSON_PK} = ? {SINGLE_LESSON_PUBLISHED_FILTER}
        """,
        (session["user_id"], lesson_id),
    ).fetchone()
    if row is None:
        return json_error("This lesson is not available.", 404)
    return jsonify({"lesson": dict(row)})


@app.put("/api/lessons/<int:lesson_id>/progress")
@login_required
def update_lesson_progress(lesson_id):
    data = request.get_json(silent=True) or {}
    progress_percent = data.get("progress_percent")
    if type(progress_percent) is not int or not 1 <= progress_percent <= 99:
        return json_error("Progress must be a whole number between 1 and 99. Use lesson completion to reach 100.", 400)
    db = get_db()
    lesson = db.execute(
        f"""
        SELECT l.{LESSON_PK} AS id, l.content
        FROM lessons l
        JOIN learning_paths p ON p.{PATH_PK} = l.path_id AND p.is_published = TRUE
        WHERE l.{LESSON_PK} = ? {SINGLE_LESSON_PUBLISHED_FILTER}
        """,
        (lesson_id,),
    ).fetchone()
    if lesson is None:
        return json_error("This lesson is not available.", 404)
    if not isinstance(lesson["content"], dict) or not lesson["content"].get("sections"):
        return (
            jsonify(
                {
                    "error": "This lesson has no published lesson material.",
                    "missing_data": [
                        {
                            "table": "lessons.content",
                            "records": "Add a sections array with titled lesson content before saving progress.",
                        }
                    ],
                }
            ),
            409,
        )
    db.execute(
        """
        INSERT INTO lesson_progress
            (user_id, lesson_id, status, progress_percent, started_at, updated_at)
        VALUES(?, ?, 'in_progress', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, lesson_id)
        DO UPDATE SET
            status = CASE
                WHEN lesson_progress.status = 'completed' THEN 'completed'
                ELSE 'in_progress'
            END,
            progress_percent = CASE
                WHEN lesson_progress.status = 'completed' THEN 100
                ELSE GREATEST(lesson_progress.progress_percent, excluded.progress_percent)
            END,
            started_at = COALESCE(lesson_progress.started_at, excluded.started_at),
            updated_at = CURRENT_TIMESTAMP
        """,
        (session["user_id"], lesson_id, progress_percent),
    )
    db.commit()
    saved = db.execute(
        "SELECT status, progress_percent FROM lesson_progress "
        "WHERE user_id = ? AND lesson_id = ?",
        (session["user_id"], lesson_id),
    ).fetchone()
    return jsonify(
        {
            "success": True,
            "lesson_id": lesson_id,
            "status": saved["status"],
            "progress": saved["progress_percent"],
        }
    )


@app.get("/api/vocabulary")
@login_required
def vocabulary():
    rows = get_db().execute(
        f"""
        SELECT v.{SIGN_PK} AS id, v.word, v.meaning, v.category, v.hint, v.media_url,
               (f.user_id IS NOT NULL) AS is_saved
        FROM signs v
        LEFT JOIN sign_favorites f
          ON f.sign_id = v.{SIGN_PK} AND f.user_id = ?
        WHERE v.is_published = TRUE
        ORDER BY v.category, v.word
        """,
        (session["user_id"],),
    ).fetchall()
    return jsonify({"words": [dict(row) for row in rows]})


@app.route("/api/vocabulary/<int:sign_id>/favorite", methods=["PUT", "DELETE"])
@login_required
def vocabulary_favorite(sign_id):
    db = get_db()
    sign = db.execute(
        f"SELECT {SIGN_PK} FROM signs WHERE {SIGN_PK} = ? AND is_published = TRUE",
        (sign_id,),
    ).fetchone()
    if sign is None:
        return json_error("This vocabulary sign is not available.", 404)
    if request.method == "PUT":
        db.execute(
            "INSERT INTO sign_favorites(user_id, sign_id) "
            "VALUES(?, ?) ON CONFLICT(user_id, sign_id) DO NOTHING",
            (session["user_id"], sign_id),
        )
        saved = True
    else:
        db.execute(
            "DELETE FROM sign_favorites WHERE user_id = ? AND sign_id = ?",
            (session["user_id"], sign_id),
        )
        saved = False
    db.commit()
    return jsonify({"id": sign_id, "is_saved": saved})


@app.get("/api/scenarios")
@login_required
def scenarios():
    rows = get_db().execute(
        f"SELECT {ACTIVITY_PK} AS id, slug, title, content FROM activities "
        f"WHERE activity_type = 'scenario' AND is_published = TRUE ORDER BY {ACTIVITY_PK}"
    ).fetchall()
    return jsonify(
        {
            "scenarios": [
                {
                    "id": row["id"],
                    "slug": row["slug"],
                    "title": row["title"],
                    "category": (row["content"] or {}).get("category"),
                    "description": (row["content"] or {}).get("description"),
                    "emoji": (row["content"] or {}).get("emoji"),
                    "color": (row["content"] or {}).get("color"),
                    "duration_minutes": (row["content"] or {}).get("duration_minutes"),
                }
                for row in rows
            ]
        }
    )


@app.get("/api/challenges")
@login_required
def challenges():
    rows = get_db().execute(
        f"SELECT {ACTIVITY_PK} AS id, slug, title, content FROM activities "
        f"WHERE activity_type = 'challenge' AND is_published = TRUE ORDER BY {ACTIVITY_PK}"
    ).fetchall()
    return jsonify({"challenges": [dict(row) for row in rows]})


@app.get("/api/practice")
@login_required
def practice_activities():
    rows = get_db().execute(
        f"SELECT {ACTIVITY_PK} AS id, slug, title, content FROM activities "
        f"WHERE activity_type = 'practice' AND is_published = TRUE ORDER BY {ACTIVITY_PK}"
    ).fetchall()
    return jsonify({"activities": [dict(row) for row in rows]})


@app.get("/api/activities/<int:activity_id>")
@login_required
def activity_detail(activity_id):
    row = get_db().execute(
        f"""
        SELECT {ACTIVITY_PK} AS id, slug, activity_type, title, content
        FROM activities
        WHERE {ACTIVITY_PK} = ? AND is_published = TRUE
        """,
        (activity_id,),
    ).fetchone()
    if row is None:
        return json_error("This activity is not available.", 404)
    return jsonify({"activity": dict(row)})


@app.post("/api/progress/complete")
@login_required
def record_progress():
    data = request.get_json(silent=True) or {}
    activity_id = data.get("activity_id")
    if isinstance(activity_id, bool) or not isinstance(activity_id, int) or activity_id < 1:
        return json_error("A valid published activity is required.", 400)
    db = get_db()
    activity = db.execute(
        f"SELECT {ACTIVITY_PK} AS id, title, activity_type, content FROM activities "
        f"WHERE {ACTIVITY_PK} = ? AND is_published = TRUE",
        (activity_id,),
    ).fetchone()
    if activity is None:
        return json_error("This activity is not available.", 404)
    response = data.get("response", {})
    if not isinstance(response, dict):
        return json_error("Activity response must be an object.", 400)
    if activity["activity_type"] == "practice":
        score = 100
    else:
        questions = (activity["content"] or {}).get("questions", [])
        answers = response.get("answers")
        if not isinstance(questions, list) or not questions:
            return json_error("This activity has no published questions yet.", 409)
        if not isinstance(answers, list) or len(answers) != len(questions):
            return json_error("Submit one answer for every published question.", 400)
        correct = 0
        for question, answer in zip(questions, answers):
            choices = question.get("choices", []) if isinstance(question, dict) else []
            if not isinstance(choices, list) or not choices:
                return json_error("This activity has invalid question data.", 409)
            if isinstance(answer, bool) or not isinstance(answer, (str, int)):
                return json_error("Each answer must identify a published choice.", 400)
            correct_choices = [
                isinstance(choice, dict) and choice.get("is_correct") is True
                for choice in choices
            ]
            if sum(correct_choices) != 1:
                return json_error("Each activity question must have exactly one correct choice.", 409)
            selected = next(
                (
                    choice
                    for choice in choices
                    if isinstance(choice, dict)
                    and answer in (choice.get("id"), choice.get("label"))
                ),
                None,
            )
            if selected and selected.get("is_correct") is True:
                correct += 1
        score = round(correct * 100 / len(questions))
    db.execute(
        "INSERT INTO activity_attempts(activity_id, user_id, score, status, response, completed_at) "
        "VALUES(?, ?, ?, 'completed', ?, now())",
        (activity_id, session["user_id"], score, Jsonb(response)),
    )
    db.commit()
    return jsonify({"success": True, "activity": activity["title"], "score": score}), 201


@app.get("/api/progress")
@login_required
def progress():
    db = get_db()
    user_id = session["user_id"]
    rows = db.execute(
        f"""
        SELECT aa.activity_id, a.title AS activity, aa.score, aa.completed_at AS created_at
        FROM activity_attempts aa
        JOIN activities a ON a.{ACTIVITY_PK} = aa.activity_id
        WHERE aa.user_id = ? AND aa.status = 'completed'
        ORDER BY aa.completed_at DESC
        LIMIT 50
        """,
        (user_id,),
    ).fetchall()
    activity_count = db.execute(
        "SELECT COUNT(*) AS total FROM activity_attempts "
        "WHERE user_id = ? AND status = 'completed'",
        (user_id,),
    ).fetchone()["total"]
    weekly_activity = db.execute(
        f"""
        SELECT to_char(day::date, 'YYYY-MM-DD') AS activity_date,
               COUNT(aa.{ATTEMPT_PK}) AS completed
        FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, INTERVAL '1 day') AS days(day)
        LEFT JOIN activity_attempts aa
          ON aa.user_id = ? AND aa.status = 'completed'
         AND aa.completed_at::date = day::date
        GROUP BY day
        ORDER BY day
        """,
        (user_id,),
    ).fetchall()
    achievements = db.execute(
        f"""
        SELECT a.{ACHIEVEMENT_PK} AS id, a.title AS name, a.description,
               (ua.user_id IS NOT NULL) AS earned
        FROM achievements a
        LEFT JOIN user_achievements ua
          ON ua.achievement_id = a.{ACHIEVEMENT_PK} AND ua.user_id = ?
        ORDER BY a.{ACHIEVEMENT_PK}
        """,
        (user_id,),
    ).fetchall()
    lesson_records = db.execute(
        f"""
        SELECT lp.lesson_id, l.title AS lesson, p.title AS path,
               lp.status, lp.progress_percent, lp.best_score,
               lp.started_at, lp.completed_at, lp.updated_at
        FROM lesson_progress lp
        JOIN lessons l ON l.{LESSON_PK} = lp.lesson_id
        JOIN learning_paths p ON p.{PATH_PK} = l.path_id
        WHERE lp.user_id = ?
        ORDER BY lp.updated_at DESC, lp.lesson_id
        LIMIT 50
        """,
        (user_id,),
    ).fetchall()
    return jsonify(
        {
            "events": [dict(row) for row in rows],
            "lessons": [dict(row) for row in lesson_records],
            "activity_count": activity_count,
            "weekly_activity": [dict(row) for row in weekly_activity],
            "achievements": [dict(row) for row in achievements],
            "current_streak": activity_streak(db, user_id),
        }
    )


@app.get("/api/instructor/learners")
@instructor_required
def instructor_learners():
    db = get_db()
    rows = db.execute(
        f"""
        SELECT cm.{MEMBERSHIP_PK} AS membership_id, u.{USER_PK} AS user_id,
               u.name AS name,
               COUNT(DISTINCT aa.{ATTEMPT_PK}) AS activities,
               AVG(aa.score) AS accuracy,
               MAX(aa.completed_at) AS last_active
        FROM classrooms c
        JOIN classroom_memberships cm ON cm.classroom_id = c.{CLASSROOM_PK}
        JOIN users u ON u.{USER_PK} = cm.user_id AND u.role = 'learner'
        LEFT JOIN activity_attempts aa
          ON aa.user_id = u.{USER_PK} AND aa.status = 'completed'
        WHERE c.instructor_id = ? AND c.is_active = TRUE
          AND cm.status = 'active'
        GROUP BY cm.{MEMBERSHIP_PK}, u.{USER_PK}, u.name
        ORDER BY name
        """,
        (session["user_id"],),
    ).fetchall()
    learners = []
    for row in rows:
        accuracy = round(row["accuracy"]) if row["accuracy"] is not None else None
        learners.append(
            {
                "id": row["user_id"],
                "name": row["name"] or "Invited learner",
                "level": "Not assessed" if accuracy is None else "Trailblazer" if accuracy >= 90 else "Explorer" if accuracy >= 80 else "Sprout",
                "activities": row["activities"],
                "accuracy": accuracy,
                "last_active": row["last_active"],
            }
        )
    return jsonify({"learners": learners})


@app.get("/api/instructor/learners/<int:learner_id>")
@instructor_required
def instructor_learner_detail(learner_id):
    db = get_db()
    row = db.execute(
        f"""
        SELECT u.{USER_PK} AS id, u.name, COUNT(DISTINCT aa.{ATTEMPT_PK}) AS activities,
               AVG(aa.score) AS accuracy, MAX(aa.completed_at) AS last_active
        FROM users u
        JOIN classroom_memberships cm ON cm.user_id = u.{USER_PK} AND cm.status = 'active'
        JOIN classrooms c ON c.{CLASSROOM_PK} = cm.classroom_id
        LEFT JOIN activity_attempts aa
          ON aa.user_id = u.{USER_PK} AND aa.status = 'completed'
        WHERE u.{USER_PK} = ? AND u.role = 'learner'
          AND c.instructor_id = ? AND c.is_active = TRUE
        GROUP BY u.{USER_PK}, u.name
        """,
        (learner_id, session["user_id"]),
    ).fetchone()
    if row is None:
        return json_error("Learner not found.", 404)
    accuracy = round(row["accuracy"]) if row["accuracy"] is not None else None
    learner = {
        "id": row["id"],
        "name": row["name"],
        "level": "Not assessed" if accuracy is None else "Trailblazer" if accuracy >= 90 else "Explorer" if accuracy >= 80 else "Sprout",
        "activities": row["activities"],
        "accuracy": accuracy,
        "last_active": row["last_active"],
    }
    events = db.execute(
        f"""
        SELECT a.title AS activity, aa.score, aa.completed_at AS created_at
        FROM activity_attempts aa
        JOIN activities a ON a.{ACTIVITY_PK} = aa.activity_id
        JOIN classroom_memberships cm ON cm.user_id = aa.user_id AND cm.status = 'active'
        JOIN classrooms c ON c.{CLASSROOM_PK} = cm.classroom_id
        WHERE aa.user_id = ? AND aa.status = 'completed'
          AND c.instructor_id = ? AND c.is_active = TRUE
        GROUP BY aa.{ATTEMPT_PK}, a.title, aa.score, aa.completed_at
        ORDER BY aa.completed_at DESC
        LIMIT 10
        """,
        (learner_id, session["user_id"]),
    ).fetchall()
    return jsonify({"learner": learner, "events": [dict(event) for event in events]})


@app.get("/api/instructor/classrooms")
@instructor_required
def instructor_classrooms():
    rows = get_db().execute(
        f"""
        SELECT c.{CLASSROOM_PK} AS id, c.name, c.invite_code AS code, c.description, c.created_at,
               COUNT(m.{MEMBERSHIP_PK}) AS student_count
        FROM classrooms c
        LEFT JOIN classroom_memberships m
          ON m.classroom_id = c.{CLASSROOM_PK} AND m.status = 'active'
        WHERE c.instructor_id = ? AND c.is_active = TRUE
        GROUP BY c.{CLASSROOM_PK}
        ORDER BY c.{CLASSROOM_PK}
        """,
        (session["user_id"],),
    ).fetchall()
    return jsonify({"classrooms": [dict(row) for row in rows]})


@app.get("/api/classrooms")
@login_required
def learner_classrooms():
    if session["role"] != "learner":
        return json_error("Learner access is required.", 403)
    rows = get_db().execute(
        f"""
        SELECT c.{CLASSROOM_PK} AS id, c.name, c.description, c.created_at, cm.joined_at
        FROM classroom_memberships cm
        JOIN classrooms c ON c.{CLASSROOM_PK} = cm.classroom_id
        WHERE cm.user_id = ? AND cm.status = 'active' AND c.is_active = TRUE
        ORDER BY c.{CLASSROOM_PK}
        """,
        (session["user_id"],),
    ).fetchall()
    return jsonify({"classrooms": [dict(row) for row in rows]})


@app.post("/api/classrooms/join")
@login_required
def join_classroom():
    if session["role"] != "learner":
        return json_error("Learner access is required.", 403)
    data = request.get_json(silent=True) or {}
    code = str(data.get("code", "")).strip().upper()
    if not code or len(code) > 100:
        return json_error("Enter a valid classroom code.", 400)
    db = get_db()
    classroom = db.execute(
        f"SELECT {CLASSROOM_PK} AS id, name, description, invite_code AS code "
        "FROM classrooms WHERE upper(invite_code) = ? AND is_active = TRUE",
        (code,),
    ).fetchone()
    if classroom is None:
        return json_error("No active classroom uses that code.", 404)
    try:
        membership_id = insert_id(
            db,
            "INSERT INTO classroom_memberships"
            "(user_id, classroom_id, status, joined_at) "
            "VALUES(?, ?, 'active', CURRENT_TIMESTAMP)",
            (session["user_id"], classroom["id"]),
            MEMBERSHIP_PK,
        )
        db.commit()
    except INTEGRITY_ERRORS:
        db.rollback()
        return json_error("You have already joined this classroom.", 409)
    return jsonify({"classroom": dict(classroom), "membership_id": membership_id}), 201


@app.get("/api/instructor/classrooms/<int:classroom_id>/students")
@instructor_required
def classroom_students(classroom_id):
    db = get_db()
    classroom = db.execute(
        f"SELECT {CLASSROOM_PK} AS id, name, invite_code AS code FROM classrooms "
        f"WHERE {CLASSROOM_PK} = ? AND instructor_id = ? AND is_active = TRUE",
        (classroom_id, session["user_id"]),
    ).fetchone()
    if classroom is None:
        return json_error("Classroom not found.", 404)
    students = db.execute(
        f"""
        SELECT cm.{MEMBERSHIP_PK} AS id, u.name, u.email, cm.joined_at AS created_at
        FROM classroom_memberships cm
        JOIN users u ON u.{USER_PK} = cm.user_id
        WHERE cm.classroom_id = ? AND cm.status = 'active'
        ORDER BY cm.{MEMBERSHIP_PK}
        """,
        (classroom_id,),
    ).fetchall()
    return jsonify({"classroom": dict(classroom), "students": [dict(row) for row in students]})


@app.post("/api/instructor/classrooms/<int:classroom_id>/students")
@instructor_required
def add_classroom_student(classroom_id):
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    if not name or len(name) > 70:
        return json_error("Learner name must be between 1 and 70 characters.", 400)
    if len(email) > 254 or "@" not in email:
        return json_error("Enter a valid learner email address.", 400)
    db = get_db()
    classroom = db.execute(
        f"SELECT {CLASSROOM_PK} FROM classrooms "
        f"WHERE {CLASSROOM_PK} = ? AND instructor_id = ? AND is_active = TRUE",
        (classroom_id, session["user_id"]),
    ).fetchone()
    if classroom is None:
        return json_error("Classroom not found.", 404)
    try:
        student_account = db.execute(
            f"SELECT {USER_PK} AS id, name, email FROM users "
            f"WHERE lower(email) = ? AND role = 'learner' AND is_active = TRUE",
            (email,),
        ).fetchone()
        if student_account is None:
            return json_error(
                "Create the learner account before adding them to a classroom.",
                404,
            )
        student_id = insert_id(
            db,
            "INSERT INTO classroom_memberships"
            "(classroom_id, user_id, invited_email, status, joined_at) "
            "VALUES(?, ?, ?, 'active', CURRENT_TIMESTAMP)",
            (classroom_id, student_account["id"], email),
            MEMBERSHIP_PK,
        )
        db.commit()
    except INTEGRITY_ERRORS:
        db.rollback()
        return json_error("That learner is already in this classroom.", 409)
    student = db.execute(
        f"SELECT cm.{MEMBERSHIP_PK} AS id, u.name, u.email, cm.joined_at AS created_at "
        "FROM classroom_memberships cm JOIN users u ON u.user_id = cm.user_id "
        f"WHERE cm.{MEMBERSHIP_PK} = ?",
        (student_id,),
    ).fetchone()
    return jsonify({"student": dict(student)}), 201


@app.post("/api/instructor/classrooms")
@instructor_required
def create_classroom():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    description = str(data.get("description", "")).strip()
    if not name or len(name) > 60:
        return json_error("Classroom name must be between 1 and 60 characters.", 400)
    if len(description) > 240:
        return json_error("Classroom description must be 240 characters or fewer.", 400)
    db = get_db()
    code_column = "invite_code"
    code = secrets.token_urlsafe(5).replace("-", "").replace("_", "").upper()[:8]
    while db.execute(
        f"SELECT {CLASSROOM_PK} FROM classrooms WHERE {code_column} = ?", (code,)
    ).fetchone():
        code = secrets.token_urlsafe(5).replace("-", "").replace("_", "").upper()[:8]
    classroom_id = insert_id(
        db,
        "INSERT INTO classrooms(instructor_id, name, description, invite_code) "
        "VALUES(?, ?, ?, ?)",
        (session["user_id"], name, description, code),
        CLASSROOM_PK,
    )
    db.commit()
    return jsonify({"id": classroom_id, "name": name, "code": code, "description": description}), 201


@app.put("/api/profile")
@login_required
def update_profile():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    learner_type = str(data.get("learner_type", "Adult learner")).strip()
    learning_goal = str(data.get("learning_goal", "Everyday conversations")).strip()
    if not name or len(name) > 70:
        return json_error("Name must be between 1 and 70 characters.", 400)
    if learner_type not in ("Adult learner", "Child learner", "Parent or caregiver", "Educator"):
        return json_error("Choose a valid learner type.", 400)
    if learning_goal not in (
        "Everyday conversations",
        "Connect with family",
        "Learn for my classroom",
        "Explore Filipino culture",
    ):
        return json_error("Choose a valid learning goal.", 400)
    db = get_db()
    db.execute(
        f"UPDATE users SET name = ?, learner_type = ?, learning_goal = ? WHERE {USER_PK} = ?",
        (name, learner_type, learning_goal, session["user_id"]),
    )
    db.commit()
    user = db.execute(
        f"SELECT * FROM users WHERE {USER_PK} = ?", (session["user_id"],)
    ).fetchone()
    return jsonify({"user": public_user(user)})


if __name__ == "__main__":
    initialize_database()
    app.run(host="127.0.0.1", port=5000, debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true")
