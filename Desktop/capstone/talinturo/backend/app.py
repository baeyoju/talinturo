import hashlib
import hmac
import os
import re
import secrets
import sqlite3
from functools import wraps
from pathlib import Path

from authlib.integrations.flask_client import OAuth
from flask import Flask, g, jsonify, redirect, request, session
from flask_cors import CORS

try:
    import psycopg
    from psycopg.rows import dict_row
    from psycopg.types.json import Jsonb
except ImportError:
    psycopg = None
    dict_row = None
    Jsonb = None

INTEGRITY_ERRORS = (sqlite3.IntegrityError,) + (
    (psycopg.IntegrityError,) if psycopg is not None else ()
)
BASE_DIR = Path(__file__).resolve().parent
DATABASE = Path(os.environ.get("TALINTURO_DATABASE", BASE_DIR / "talinturo.sqlite3"))
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
USE_POSTGRES = bool(DATABASE_URL)
DEMO_MODE = os.environ.get("TALINTURO_DEMO_MODE", "true").lower() == "true"
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

    def close(self):
        self.connection.close()


class GoogleAccountNotFound(ValueError):
    pass


app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get("TALINTURO_SECRET_KEY", "local-development-key-change-before-deploy"),
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
        if USE_POSTGRES:
            if psycopg is None:
                raise RuntimeError("PostgreSQL support requires psycopg. Install backend/requirements.txt.")
            g.db = PostgresDatabase(psycopg.connect(DATABASE_URL, row_factory=dict_row))
        else:
            DATABASE.parent.mkdir(parents=True, exist_ok=True)
            g.db = sqlite3.connect(DATABASE)
            g.db.row_factory = sqlite3.Row
            g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


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
    if USE_POSTGRES:
        return bytes.fromhex(salt), bytes.fromhex(password_hash)
    return salt, password_hash


def insert_id(db, sql, params):
    if USE_POSTGRES:
        return db.execute(f"{sql} RETURNING id", params).fetchone()["id"]
    return db.execute(sql, params).lastrowid


def require_postgres_schema(db):
    required_tables = {
        "users",
        "oauth_accounts",
        "classrooms",
        "classroom_memberships",
        "learning_paths",
        "lessons",
        "activities",
        "vocabulary_signs",
        "activity_attempts",
        "lesson_progress",
        "achievements",
        "user_achievements",
        "user_preferences",
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
            f"{', '.join(missing_tables)}. Run the Talinturo schema SQL before starting the API."
        )


def seed_postgres_demo_data(db):
    demo_users = (
        ("Jamie Santos", "teacher@example.com", "instructor"),
        ("Alex Rivera", "learner@example.com", "learner"),
    )
    user_ids = {}
    for name, email, role in demo_users:
        user = db.execute("SELECT id FROM users WHERE lower(email) = ?", (email,)).fetchone()
        if user is None:
            salt, password_hash = hash_password("Talinturo2025!")
            salt, password_hash = stored_password_values(salt, password_hash)
            user_id = insert_id(
                db,
                "INSERT INTO users(name, email, password_salt, password_hash, role) "
                "VALUES(?, ?, ?, ?, ?)",
                (name, email, salt, password_hash, role),
            )
        else:
            user_id = user["id"]
        user_ids[email] = user_id

    classroom = db.execute(
        "SELECT id FROM classrooms WHERE instructor_id = ? AND invite_code = ?",
        (user_ids["teacher@example.com"], "SUNNY24"),
    ).fetchone()
    if classroom is None:
        classroom_id = insert_id(
            db,
            "INSERT INTO classrooms(instructor_id, name, description, invite_code) "
            "VALUES(?, ?, ?, ?)",
            (
                user_ids["teacher@example.com"],
                "Sunshine Sign Stars",
                "A friendly place to learn together.",
                "SUNNY24",
            ),
        )
    else:
        classroom_id = classroom["id"]

    db.execute(
        "INSERT INTO classroom_memberships(classroom_id, user_id, status, joined_at) "
        "VALUES(?, ?, 'active', now()) ON CONFLICT (classroom_id, user_id) "
        "WHERE user_id IS NOT NULL DO NOTHING",
        (classroom_id, user_ids["learner@example.com"]),
    )

    db.execute(
        "INSERT INTO learning_paths(slug, title, description, level, sort_order, is_published) "
        "VALUES('fsl-foundations', 'FSL Foundations', "
        "'Start conversations with friendly everyday signs.', 'Beginner', 1, TRUE) "
        "ON CONFLICT(slug) DO NOTHING"
    )
    path = db.execute(
        "SELECT id FROM learning_paths WHERE slug = 'fsl-foundations'"
    ).fetchone()
    starter_lessons = (
        ("kumusta-hello", "Kumusta! Let's say hello", 8),
        ("all-about-me", "All about me", 12),
        ("everyday-essentials", "Everyday essentials", 10),
    )
    for order, (slug, title, duration) in enumerate(starter_lessons, start=1):
        db.execute(
            "INSERT INTO lessons(path_id, slug, title, duration_minutes, sort_order, is_published) "
            "VALUES(?, ?, ?, ?, ?, TRUE) ON CONFLICT(slug) DO NOTHING",
            (path["id"], slug, title, duration, order),
        )

    starter_words = (
        ("kumusta", "Kumusta", "Hello / How are you?", "Greetings", "A friendly greeting to start a conversation."),
        ("salamat", "Salamat", "Thank you", "Everyday", "Show gratitude with this everyday sign."),
        ("pamilya", "Pamilya", "Family", "People", "Talk about the people closest to you."),
        ("kaibigan", "Kaibigan", "Friend", "People", "Someone you enjoy spending time with."),
        ("tubig", "Tubig", "Water", "Everyday", "A useful sign for asking for a drink."),
        ("paalam", "Paalam", "Goodbye", "Greetings", "A warm way to end a conversation."),
    )
    for slug, word, meaning, category, hint in starter_words:
        db.execute(
            "INSERT INTO vocabulary_signs(slug, word, meaning, category, hint, is_published) "
            "VALUES(?, ?, ?, ?, ?, TRUE) ON CONFLICT(slug) DO NOTHING",
            (slug, word, meaning, category, hint),
        )

    starter_scenarios = (
        ("at-the-sari-sari-store", "At the sari-sari store", "Everyday life", "Practice asking for what you need in a friendly neighborhood shop.", "🏪", "peach"),
        ("meeting-a-new-friend", "Meeting a new friend", "Social", "Introduce yourself and learn a little about someone new.", "🧑‍🤝‍🧑", "lavender"),
        ("lunchtime-at-school", "Lunchtime at school", "School", "Share what you like and ask a classmate a question.", "🍱", "mint"),
    )
    for order, (slug, title, category, description, emoji, color) in enumerate(starter_scenarios, start=1):
        db.execute(
            "INSERT INTO activities"
            "(slug, activity_type, title, content, sort_order, is_published) "
            "VALUES(?, 'scenario', ?, ?, ?, TRUE) ON CONFLICT(slug) DO NOTHING",
            (
                slug,
                title,
                Jsonb(
                    {
                        "category": category,
                        "description": description,
                        "emoji": emoji,
                        "color": color,
                    }
                ),
                order,
            ),
        )
    db.commit()


def initialize_database():
    if USE_POSTGRES:
        with app.app_context():
            db = get_db()
            require_postgres_schema(db)
            if DEMO_MODE:
                seed_postgres_demo_data(db)
        return

    with app.app_context():
        db = get_db()
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'learner',
                learner_type TEXT NOT NULL DEFAULT 'Adult learner',
                learning_goal TEXT NOT NULL DEFAULT 'Everyday conversations',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS oauth_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider TEXT NOT NULL,
                subject TEXT NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(provider, subject)
            );
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                theme_mode TEXT NOT NULL DEFAULT 'light' CHECK (theme_mode IN ('light', 'dark')),
                reminders INTEGER NOT NULL DEFAULT 1,
                sound INTEGER NOT NULL DEFAULT 1,
                reduced_motion INTEGER NOT NULL DEFAULT 0,
                weekly_summary INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS classrooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE,
                description TEXT NOT NULL DEFAULT '',
                instructor_id INTEGER REFERENCES users(id),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS progress_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                activity TEXT NOT NULL,
                score INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS classroom_students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(classroom_id, email)
            );
            """
        )
        user_columns = {row["name"] for row in db.execute("PRAGMA table_info(users)")}
        if "learner_type" not in user_columns:
            db.execute("ALTER TABLE users ADD COLUMN learner_type TEXT NOT NULL DEFAULT 'Adult learner'")
        if "learning_goal" not in user_columns:
            db.execute("ALTER TABLE users ADD COLUMN learning_goal TEXT NOT NULL DEFAULT 'Everyday conversations'")
        if db.execute("SELECT id FROM users LIMIT 1").fetchone() is None:
            salt, password_hash = hash_password("Talinturo2025!")
            teacher_id = db.execute(
                "INSERT INTO users(name, email, password_salt, password_hash, role) VALUES(?, ?, ?, ?, ?)",
                ("Jamie Santos", "teacher@example.com", salt, password_hash, "instructor"),
            ).lastrowid
            learner_salt, learner_hash = hash_password("Talinturo2025!")
            learner_id = db.execute(
                "INSERT INTO users(name, email, password_salt, password_hash, role) VALUES(?, ?, ?, ?, ?)",
                ("Alex Rivera", "learner@example.com", learner_salt, learner_hash, "learner"),
            ).lastrowid
            db.execute(
                "INSERT INTO classrooms(name, code, description, instructor_id) VALUES(?, ?, ?, ?)",
                ("Sunshine Sign Stars", "SUNNY24", "A friendly place to learn together.", teacher_id),
            )
            db.execute(
                "INSERT INTO classrooms(name, code, description, instructor_id) VALUES(?, ?, ?, ?)",
                ("Little Language Club", "FSLCLUB8", "Small signs, big connections.", teacher_id),
            )
            for activity, score in (("greetings", 92), ("vocabulary", 86), ("scenario-store", 100)):
                db.execute(
                    "INSERT INTO progress_events(user_id, activity, score) VALUES(?, ?, ?)",
                    (learner_id, activity, score),
                )
        db.commit()


def json_error(message, status):
    return jsonify({"error": message}), status


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return json_error("Please sign in to continue.", 401)
        return view(*args, **kwargs)

    return wrapped


def instructor_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return json_error("Please sign in to continue.", 401)
        if session.get("role") != "instructor":
            return json_error("Instructor access is required.", 403)
        return view(*args, **kwargs)

    return wrapped


def public_user(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "learner_type": row["learner_type"] or "Adult learner",
        "learning_goal": row["learning_goal"] or "Everyday conversations",
    }


def get_or_create_google_user(userinfo, allow_signup=True):
    subject = str(userinfo.get("sub", "")).strip()
    email = str(userinfo.get("email", "")).strip().lower()
    if not subject or not email or userinfo.get("email_verified") is not True:
        raise ValueError("Google did not provide a verified account email.")

    db = get_db()
    linked_user = db.execute(
        """SELECT users.* FROM users
           JOIN oauth_accounts ON oauth_accounts.user_id = users.id
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
        )
        user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    db.execute(
        "INSERT INTO oauth_accounts(provider, subject, user_id) VALUES(?, ?, ?)",
        ("google", subject, user["id"]),
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
    session["user_id"] = user["id"]
    session["role"] = user["role"]
    if flow == "signup":
        return redirect(f"{FRONTEND_URL}/profile/setup")
    destination = "/instructor" if user["role"] == "instructor" else "/"
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
    session.clear()
    session["user_id"] = user["id"]
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
        )
        db.commit()
    except INTEGRITY_ERRORS:
        return json_error("An account already exists for that email.", 409)
    session.clear()
    session["user_id"] = user_id
    session["role"] = "learner"
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return jsonify({"user": public_user(user)}), 201


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
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
    session.clear()
    session["user_id"] = user["id"]
    session["role"] = user["role"]
    return jsonify({"user": public_user(user)})


@app.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify({"success": True})


@app.get("/api/auth/me")
@login_required
def current_user():
    user = get_db().execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()
    return jsonify({"user": public_user(user)})


@app.get("/api/preferences")
@login_required
def preferences():
    db = get_db()
    db.execute(
        "INSERT INTO user_preferences(user_id) VALUES(?) "
        "ON CONFLICT(user_id) DO NOTHING",
        (session["user_id"],),
    )
    db.commit()
    row = db.execute(
        "SELECT theme_mode, reminders, sound, reduced_motion, weekly_summary "
        "FROM user_preferences WHERE user_id = ?",
        (session["user_id"],),
    ).fetchone()
    return jsonify({"preferences": dict(row)})


@app.put("/api/preferences")
@login_required
def update_preferences():
    data = request.get_json(silent=True) or {}
    theme_mode = data.get("theme_mode")
    boolean_fields = ("reminders", "sound", "reduced_motion", "weekly_summary")
    if theme_mode not in ("light", "dark"):
        return json_error("Theme mode must be light or dark.", 400)
    if any(not isinstance(data.get(field), bool) for field in boolean_fields):
        return json_error("All preference toggles must be true or false.", 400)

    db = get_db()
    db.execute(
        """
        INSERT INTO user_preferences
            (user_id, theme_mode, reminders, sound, reduced_motion, weekly_summary, updated_at)
        VALUES(?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            theme_mode = excluded.theme_mode,
            reminders = excluded.reminders,
            sound = excluded.sound,
            reduced_motion = excluded.reduced_motion,
            weekly_summary = excluded.weekly_summary,
            updated_at = CURRENT_TIMESTAMP
        """,
        (
            session["user_id"],
            theme_mode,
            data["reminders"],
            data["sound"],
            data["reduced_motion"],
            data["weekly_summary"],
        ),
    )
    db.commit()
    row = db.execute(
        "SELECT theme_mode, reminders, sound, reduced_motion, weekly_summary "
        "FROM user_preferences WHERE user_id = ?",
        (session["user_id"],),
    ).fetchone()
    return jsonify({"preferences": dict(row)})


@app.get("/api/dashboard")
@login_required
def dashboard():
    db = get_db()
    if USE_POSTGRES:
        events = db.execute(
            "SELECT COUNT(*) AS completed, COALESCE(AVG(score), 0) AS accuracy "
            "FROM activity_attempts WHERE user_id = ? AND status = 'completed'",
            (session["user_id"],),
        ).fetchone()
    else:
        events = db.execute(
            "SELECT COUNT(*) AS completed, COALESCE(AVG(score), 0) AS accuracy "
            "FROM progress_events WHERE user_id = ?",
            (session["user_id"],),
        ).fetchone()
    classrooms = db.execute("SELECT COUNT(*) AS total FROM classrooms WHERE instructor_id = ?", (session["user_id"],)).fetchone()
    return jsonify(
        {
            "role": session["role"],
            "lessons_completed": events["completed"],
            "average_score": round(events["accuracy"]),
            "classrooms": classrooms["total"],
        }
    )


@app.get("/api/paths")
@login_required
def learning_paths():
    if USE_POSTGRES:
        rows = get_db().execute(
            """
            SELECT p.id, p.title, p.description, p.level, COUNT(DISTINCT l.id) AS lessons,
                   COALESCE(ROUND(AVG(lp.progress_percent))::INTEGER, 0) AS progress
            FROM learning_paths p
            LEFT JOIN lessons l ON l.path_id = p.id AND l.is_published = TRUE
            LEFT JOIN lesson_progress lp
              ON lp.lesson_id = l.id AND lp.user_id = ?
            WHERE p.is_published = TRUE
            GROUP BY p.id
            ORDER BY p.sort_order, p.id
            """,
            (session["user_id"],),
        ).fetchall()
        return jsonify({"paths": [dict(row) for row in rows]})
    return jsonify(
        {
            "paths": [
                {"id": "foundations", "title": "FSL Foundations", "lessons": 8, "level": "Beginner", "progress": 62},
                {"id": "conversations", "title": "Everyday conversations", "lessons": 6, "level": "Beginner", "progress": 25},
                {"id": "expression", "title": "Express yourself", "lessons": 10, "level": "Growing", "progress": 0},
            ]
        }
    )


@app.get("/api/vocabulary")
@login_required
def vocabulary():
    if USE_POSTGRES:
        rows = get_db().execute(
            "SELECT word, meaning, category, hint, media_url FROM vocabulary_signs "
            "WHERE is_published = TRUE ORDER BY category, word"
        ).fetchall()
        return jsonify({"words": [dict(row) for row in rows]})
    return jsonify(
        {
            "words": [
                {"word": "Kumusta", "meaning": "Hello / How are you?", "category": "Greetings"},
                {"word": "Salamat", "meaning": "Thank you", "category": "Everyday"},
                {"word": "Pamilya", "meaning": "Family", "category": "People"},
                {"word": "Kaibigan", "meaning": "Friend", "category": "People"},
                {"word": "Tubig", "meaning": "Water", "category": "Everyday"},
                {"word": "Paalam", "meaning": "Goodbye", "category": "Greetings"},
            ]
        }
    )


@app.get("/api/scenarios")
@login_required
def scenarios():
    if USE_POSTGRES:
        rows = get_db().execute(
            "SELECT id, slug, title, content FROM activities "
            "WHERE activity_type = 'scenario' AND is_published = TRUE ORDER BY sort_order, id"
        ).fetchall()
        return jsonify(
            {
                "scenarios": [
                    {
                        "id": row["id"],
                        "title": row["title"],
                        "category": (row["content"] or {}).get("category", "Practice"),
                        "description": (row["content"] or {}).get("description", ""),
                        "emoji": (row["content"] or {}).get("emoji"),
                        "color": (row["content"] or {}).get("color"),
                    }
                    for row in rows
                ]
            }
        )
    return jsonify(
        {
            "scenarios": [
                {"id": "store", "title": "At the sari-sari store", "category": "Everyday life"},
                {"id": "friend", "title": "Meeting a new friend", "category": "Social"},
                {"id": "lunch", "title": "Lunchtime at school", "category": "School"},
            ]
        }
    )


@app.post("/api/progress/complete")
@login_required
def record_progress():
    data = request.get_json(silent=True) or {}
    activity = str(data.get("activity", "")).strip()
    score = data.get("score", 0)
    if not activity or len(activity) > 80:
        return json_error("A valid activity name is required.", 400)
    if isinstance(score, bool) or not isinstance(score, int) or not 0 <= score <= 100:
        return json_error("Score must be a whole number between 0 and 100.", 400)
    db = get_db()
    if USE_POSTGRES:
        slug = f"practice-{hashlib.sha256(activity.encode('utf-8')).hexdigest()[:32]}"
        activity_id = db.execute(
            "INSERT INTO activities(slug, activity_type, title, content, is_published) "
            "VALUES(?, 'practice', ?, ?, FALSE) "
            "ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title RETURNING id",
            (slug, activity, Jsonb({"source": "practice-progress"})),
        ).fetchone()["id"]
        db.execute(
            "INSERT INTO activity_attempts(activity_id, user_id, score, status, response, completed_at) "
            "VALUES(?, ?, ?, 'completed', ?, now())",
            (activity_id, session["user_id"], score, Jsonb({"score": score})),
        )
    else:
        db.execute(
            "INSERT INTO progress_events(user_id, activity, score) VALUES(?, ?, ?)",
            (session["user_id"], activity, score),
        )
    db.commit()
    return jsonify({"success": True, "activity": activity, "score": score}), 201


@app.get("/api/progress")
@login_required
def progress():
    if USE_POSTGRES:
        rows = get_db().execute(
            """
            SELECT a.title AS activity, aa.score, aa.completed_at AS created_at
            FROM activity_attempts aa
            JOIN activities a ON a.id = aa.activity_id
            WHERE aa.user_id = ? AND aa.status = 'completed'
            ORDER BY aa.completed_at DESC
            LIMIT 50
            """,
            (session["user_id"],),
        ).fetchall()
    else:
        rows = get_db().execute(
            "SELECT activity, score, created_at FROM progress_events "
            "WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            (session["user_id"],),
        ).fetchall()
    return jsonify({"events": [dict(row) for row in rows]})


@app.get("/api/instructor/learners")
@instructor_required
def instructor_learners():
    if USE_POSTGRES:
        rows = get_db().execute(
            """
            SELECT cm.id AS membership_id, u.id AS user_id,
                   COALESCE(u.name, cm.invited_name) AS name,
                   COUNT(DISTINCT aa.id) AS lessons,
                   COALESCE(AVG(aa.score), 0) AS accuracy
            FROM classrooms c
            JOIN classroom_memberships cm ON cm.classroom_id = c.id
            LEFT JOIN users u ON u.id = cm.user_id AND u.role = 'learner'
            LEFT JOIN activity_attempts aa
              ON aa.user_id = u.id AND aa.status = 'completed'
            WHERE c.instructor_id = ? AND c.is_active = TRUE
              AND cm.status = 'active' AND cm.user_id IS NOT NULL
            GROUP BY cm.id, u.id, u.name, cm.invited_name
            ORDER BY name
            """,
            (session["user_id"],),
        ).fetchall()
        learners = []
        for row in rows:
            accuracy = round(row["accuracy"])
            learners.append(
                {
                    "id": row["user_id"] if row["user_id"] is not None else -row["membership_id"],
                    "name": row["name"] or "Invited learner",
                    "level": "Trailblazer" if accuracy >= 90 else "Explorer" if accuracy >= 80 else "Sprout",
                    "lessons": row["lessons"],
                    "accuracy": accuracy,
                    "streak": 0,
                }
            )
        return jsonify({"learners": learners})
    return jsonify(
        {
            "learners": [
                {"id": 1, "name": "Mia Santos", "level": "Sprout", "lessons": 18, "accuracy": 92, "streak": 6},
                {"id": 2, "name": "Ethan Cruz", "level": "Explorer", "lessons": 24, "accuracy": 86, "streak": 3},
                {"id": 3, "name": "Lia Reyes", "level": "Sprout", "lessons": 11, "accuracy": 78, "streak": 2},
                {"id": 4, "name": "Noah Garcia", "level": "Trailblazer", "lessons": 31, "accuracy": 95, "streak": 9},
            ]
        }
    )


@app.get("/api/instructor/learners/<int:learner_id>")
@instructor_required
def instructor_learner_detail(learner_id):
    if USE_POSTGRES:
        db = get_db()
        row = db.execute(
            """
            SELECT u.id, u.name, COUNT(DISTINCT aa.id) AS lessons,
                   COALESCE(AVG(aa.score), 0) AS accuracy
            FROM users u
            JOIN classroom_memberships cm ON cm.user_id = u.id AND cm.status = 'active'
            JOIN classrooms c ON c.id = cm.classroom_id
            LEFT JOIN activity_attempts aa
              ON aa.user_id = u.id AND aa.status = 'completed'
            WHERE u.id = ? AND u.role = 'learner'
              AND c.instructor_id = ? AND c.is_active = TRUE
            GROUP BY u.id, u.name
            """,
            (learner_id, session["user_id"]),
        ).fetchone()
        if row is None:
            return json_error("Learner not found.", 404)
        accuracy = round(row["accuracy"])
        learner = {
            "id": row["id"],
            "name": row["name"],
            "level": "Trailblazer" if accuracy >= 90 else "Explorer" if accuracy >= 80 else "Sprout",
            "lessons": row["lessons"],
            "accuracy": accuracy,
            "streak": 0,
        }
        events = db.execute(
            """
            SELECT a.title AS activity, aa.score, aa.completed_at AS created_at
            FROM activity_attempts aa
            JOIN activities a ON a.id = aa.activity_id
            JOIN classroom_memberships cm ON cm.user_id = aa.user_id AND cm.status = 'active'
            JOIN classrooms c ON c.id = cm.classroom_id
            WHERE aa.user_id = ? AND aa.status = 'completed'
              AND c.instructor_id = ? AND c.is_active = TRUE
            GROUP BY aa.id, a.title, aa.score, aa.completed_at
            ORDER BY aa.completed_at DESC
            LIMIT 10
            """,
            (learner_id, session["user_id"]),
        ).fetchall()
        return jsonify({"learner": learner, "events": [dict(event) for event in events]})

    learners = [
        {"id": 1, "name": "Mia Santos", "level": "Sprout", "lessons": 18, "accuracy": 92, "streak": 6},
        {"id": 2, "name": "Ethan Cruz", "level": "Explorer", "lessons": 24, "accuracy": 86, "streak": 3},
        {"id": 3, "name": "Lia Reyes", "level": "Sprout", "lessons": 11, "accuracy": 78, "streak": 2},
        {"id": 4, "name": "Noah Garcia", "level": "Trailblazer", "lessons": 31, "accuracy": 95, "streak": 9},
    ]
    learner = next((person for person in learners if person["id"] == learner_id), None)
    if learner is None:
        return json_error("Learner not found.", 404)
    return jsonify({"learner": learner})


@app.get("/api/instructor/classrooms")
@instructor_required
def instructor_classrooms():
    if USE_POSTGRES:
        rows = get_db().execute(
            """
            SELECT c.id, c.name, c.invite_code AS code, c.description, c.created_at,
                   COUNT(m.id) AS student_count
            FROM classrooms c
            LEFT JOIN classroom_memberships m
              ON m.classroom_id = c.id AND m.status <> 'removed'
            WHERE c.instructor_id = ? AND c.is_active = TRUE
            GROUP BY c.id
            ORDER BY c.id
            """,
            (session["user_id"],),
        ).fetchall()
    else:
        rows = get_db().execute(
            """
            SELECT c.id, c.name, c.code, c.description, c.created_at,
                   COUNT(s.id) AS student_count
            FROM classrooms c
            LEFT JOIN classroom_students s ON s.classroom_id = c.id
            WHERE c.instructor_id = ?
            GROUP BY c.id
            ORDER BY c.id
            """,
            (session["user_id"],),
        ).fetchall()
    return jsonify({"classrooms": [dict(row) for row in rows]})


@app.get("/api/instructor/classrooms/<int:classroom_id>/students")
@instructor_required
def classroom_students(classroom_id):
    db = get_db()
    if USE_POSTGRES:
        classroom = db.execute(
            "SELECT id, name, invite_code AS code FROM classrooms "
            "WHERE id = ? AND instructor_id = ? AND is_active = TRUE",
            (classroom_id, session["user_id"]),
        ).fetchone()
    else:
        classroom = db.execute(
            "SELECT id, name, code FROM classrooms WHERE id = ? AND instructor_id = ?",
            (classroom_id, session["user_id"]),
        ).fetchone()
    if classroom is None:
        return json_error("Classroom not found.", 404)
    if USE_POSTGRES:
        students = db.execute(
            """
            SELECT cm.id, COALESCE(u.name, cm.invited_name) AS name,
                   COALESCE(u.email, cm.invited_email) AS email, cm.created_at
            FROM classroom_memberships cm
            LEFT JOIN users u ON u.id = cm.user_id
            WHERE cm.classroom_id = ? AND cm.status <> 'removed'
            ORDER BY cm.id
            """,
            (classroom_id,),
        ).fetchall()
    else:
        students = db.execute(
            "SELECT id, name, email, created_at FROM classroom_students "
            "WHERE classroom_id = ? ORDER BY id",
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
        "SELECT id FROM classrooms WHERE id = ? AND instructor_id = ?",
        (classroom_id, session["user_id"]),
    ).fetchone()
    if classroom is None:
        return json_error("Classroom not found.", 404)
    try:
        if USE_POSTGRES:
            student_id = insert_id(
                db,
                "INSERT INTO classroom_memberships"
                "(classroom_id, invited_name, invited_email, status) "
                "VALUES(?, ?, ?, 'invited')",
                (classroom_id, name, email),
            )
        else:
            cursor = db.execute(
                "INSERT INTO classroom_students(classroom_id, name, email) VALUES(?, ?, ?)",
                (classroom_id, name, email),
            )
            student_id = cursor.lastrowid
        db.commit()
    except INTEGRITY_ERRORS:
        return json_error("That learner is already in this classroom.", 409)
    if USE_POSTGRES:
        student = db.execute(
            "SELECT id, invited_name AS name, invited_email AS email, created_at "
            "FROM classroom_memberships WHERE id = ?",
            (student_id,),
        ).fetchone()
    else:
        student = db.execute(
            "SELECT id, name, email, created_at FROM classroom_students WHERE id = ?",
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
    code_column = "invite_code" if USE_POSTGRES else "code"
    code = secrets.token_urlsafe(5).replace("-", "").replace("_", "").upper()[:8]
    while db.execute(
        f"SELECT id FROM classrooms WHERE {code_column} = ?", (code,)
    ).fetchone():
        code = secrets.token_urlsafe(5).replace("-", "").replace("_", "").upper()[:8]
    if USE_POSTGRES:
        classroom_id = insert_id(
            db,
            "INSERT INTO classrooms(instructor_id, name, description, invite_code) "
            "VALUES(?, ?, ?, ?)",
            (session["user_id"], name, description, code),
        )
    else:
        classroom_id = insert_id(
            db,
            "INSERT INTO classrooms(name, code, description, instructor_id) "
            "VALUES(?, ?, ?, ?)",
            (name, code, description, session["user_id"]),
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
        "UPDATE users SET name = ?, learner_type = ?, learning_goal = ? WHERE id = ?",
        (name, learner_type, learning_goal, session["user_id"]),
    )
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()
    return jsonify({"user": public_user(user)})


initialize_database()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true")
