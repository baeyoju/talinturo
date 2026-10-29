import hashlib
import hmac
import os
import secrets
import sqlite3
from functools import wraps
from pathlib import Path

from authlib.integrations.flask_client import OAuth
from flask import Flask, g, jsonify, redirect, request, session
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
DATABASE = Path(os.environ.get("TALINTURO_DATABASE", BASE_DIR / "talinturo.sqlite3"))
DEMO_MODE = os.environ.get("TALINTURO_DEMO_MODE", "true").lower() == "true"
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI", "http://127.0.0.1:5173/api/auth/google/callback"
)
FRONTEND_URL = os.environ.get("TALINTURO_FRONTEND_URL", "http://127.0.0.1:5173").rstrip("/")

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


def initialize_database():
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
        "learner_type": row["learner_type"],
        "learning_goal": row["learning_goal"],
    }


def get_or_create_google_user(userinfo):
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
        salt, password_hash = hash_password(secrets.token_urlsafe(48))
        name = str(userinfo.get("name", "Google learner")).strip()[:70] or "Google learner"
        user_id = db.execute(
            "INSERT INTO users(name, email, password_salt, password_hash) VALUES(?, ?, ?, ?)",
            (name, email, salt, password_hash),
        ).lastrowid
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
    return jsonify({"success": True, "message": "Talinturo API is healthy."})


@app.get("/api/auth/google")
def google_login():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return json_error("Google sign-in is not configured on the server.", 503)
    return google.authorize_redirect(GOOGLE_REDIRECT_URI)


@app.get("/api/auth/google/callback")
def google_callback():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return json_error("Google sign-in is not configured on the server.", 503)
    try:
        token = google.authorize_access_token()
        user = get_or_create_google_user(token.get("userinfo") or {})
    except Exception:
        app.logger.exception("Google sign-in failed")
        return redirect(f"{FRONTEND_URL}/login?oauth_error=google")

    session.clear()
    session["user_id"] = user["id"]
    session["role"] = user["role"]
    return redirect(FRONTEND_URL)


@app.post("/api/auth/demo")
def demo_login():
    if not DEMO_MODE:
        return json_error("Demo sign-in is disabled.", 404)
    data = request.get_json(silent=True) or {}
    role = data.get("role", "learner")
    if role not in ("learner", "instructor"):
        return json_error("Choose a valid demo role.", 400)
    email = "teacher@example.com" if role == "instructor" else "learner@example.com"
    user = get_db().execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
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
    db = get_db()
    try:
        user_id = db.execute(
            "INSERT INTO users(name, email, password_salt, password_hash) VALUES(?, ?, ?, ?)",
            (name, email, salt, password_hash),
        ).lastrowid
        db.commit()
    except sqlite3.IntegrityError:
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
    user = get_db().execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user is None:
        return json_error("Email or password is incorrect.", 401)
    salt = bytes.fromhex(user["password_salt"])
    _, supplied_hash = hash_password(password, salt)
    if not hmac.compare_digest(supplied_hash, user["password_hash"]):
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


@app.get("/api/dashboard")
@login_required
def dashboard():
    db = get_db()
    events = db.execute(
        "SELECT COUNT(*) AS completed, COALESCE(AVG(score), 0) AS accuracy FROM progress_events WHERE user_id = ?",
        (session["user_id"],),
    ).fetchone()
    classrooms = db.execute("SELECT COUNT(*) AS total FROM classrooms WHERE instructor_id = ?", (session["user_id"],)).fetchone()
    return jsonify(
        {
            "role": session["role"],
            "lessons_completed": events["completed"] + 9,
            "average_score": round(events["accuracy"]),
            "classrooms": classrooms["total"],
        }
    )


@app.get("/api/paths")
@login_required
def learning_paths():
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
    db.execute(
        "INSERT INTO progress_events(user_id, activity, score) VALUES(?, ?, ?)",
        (session["user_id"], activity, score),
    )
    db.commit()
    return jsonify({"success": True, "activity": activity, "score": score}), 201


@app.get("/api/progress")
@login_required
def progress():
    rows = get_db().execute(
        "SELECT activity, score, created_at FROM progress_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        (session["user_id"],),
    ).fetchall()
    return jsonify({"events": [dict(row) for row in rows]})


@app.get("/api/instructor/learners")
@instructor_required
def instructor_learners():
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
    classroom = db.execute(
        "SELECT id, name, code FROM classrooms WHERE id = ? AND instructor_id = ?",
        (classroom_id, session["user_id"]),
    ).fetchone()
    if classroom is None:
        return json_error("Classroom not found.", 404)
    students = db.execute(
        "SELECT id, name, email, created_at FROM classroom_students WHERE classroom_id = ? ORDER BY id",
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
        cursor = db.execute(
            "INSERT INTO classroom_students(classroom_id, name, email) VALUES(?, ?, ?)",
            (classroom_id, name, email),
        )
        db.commit()
    except sqlite3.IntegrityError:
        return json_error("That learner is already in this classroom.", 409)
    student = db.execute(
        "SELECT id, name, email, created_at FROM classroom_students WHERE id = ?",
        (cursor.lastrowid,),
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
    code = secrets.token_urlsafe(5).replace("-", "").replace("_", "").upper()[:8]
    while db.execute("SELECT id FROM classrooms WHERE code = ?", (code,)).fetchone():
        code = secrets.token_urlsafe(5).replace("-", "").replace("_", "").upper()[:8]
    cursor = db.execute(
        "INSERT INTO classrooms(name, code, description, instructor_id) VALUES(?, ?, ?, ?)",
        (name, code, description, session["user_id"]),
    )
    db.commit()
    return jsonify({"id": cursor.lastrowid, "name": name, "code": code, "description": description}), 201


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
