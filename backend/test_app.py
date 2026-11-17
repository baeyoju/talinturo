import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit

from dotenv import dotenv_values

ROOT_DIR = Path(__file__).resolve().parent.parent
TEST_DATABASE_URL = os.environ.get(
    "TALINTURO_TEST_DATABASE_URL",
    dotenv_values(ROOT_DIR / ".env").get("TALINTURO_TEST_DATABASE_URL", ""),
).strip()
if not TEST_DATABASE_URL:
    raise RuntimeError(
        "Set TALINTURO_TEST_DATABASE_URL to a dedicated PostgreSQL test database before running the API tests."
    )
test_database_name = urlsplit(TEST_DATABASE_URL).path.rsplit("/", 1)[-1].split("?", 1)[0]
if "test" not in test_database_name.lower():
    raise RuntimeError("TALINTURO_TEST_DATABASE_URL must point to a database with 'test' in its name.")
sys.path.insert(0, str(Path(__file__).resolve().parent))
import app as backend


class TalinturoApiTests(unittest.TestCase):
    def setUp(self):
        backend.DATABASE_URL = TEST_DATABASE_URL
        backend.DEMO_MODE = True
        backend.initialize_database()
        with backend.app.app_context():
            db = backend.get_db()
            db.execute(
                "TRUNCATE TABLE achievements, activities, activity_attempts, "
                "classroom_memberships, classrooms, learning_paths, lesson_progress, "
                "lessons, oauth_accounts, sign_favorites, signs, user_achievements, "
                "user_preferences, users RESTART IDENTITY CASCADE"
            )
            for name, email, role in (
                ("Jamie Santos", "teacher@example.com", "instructor"),
                ("Alex Rivera", "learner@example.com", "learner"),
            ):
                salt, password_hash = backend.hash_password("safe-password")
                backend.insert_id(
                    db,
                    "INSERT INTO users(name, email, password_salt, password_hash, role) "
                    "VALUES(?, ?, ?, ?, ?)",
                    (name, email, salt, password_hash, role),
                    backend.USER_PK,
                )
            instructor_id = db.execute(
                "SELECT user_id FROM users WHERE email = ?", ("teacher@example.com",)
            ).fetchone()["user_id"]
            backend.insert_id(
                db,
                "INSERT INTO classrooms(instructor_id, name, description, invite_code) "
                "VALUES(?, ?, ?, ?)",
                (instructor_id, "Sunshine Sign Stars", "A test classroom", "SUNNY24"),
                backend.CLASSROOM_PK,
            )
            db.commit()
        backend.app.config["TESTING"] = True
        self.client = backend.app.test_client()

    def demo_login(self, role="learner"):
        return self.client.post("/api/auth/demo", json={"role": role})

    def test_database_initialization_does_not_seed_sample_accounts_by_default(self):
        with backend.app.app_context():
            db = backend.get_db()
            db.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE")
            backend.initialize_database()
            user_count = db.execute("SELECT COUNT(*) AS total FROM users").fetchone()["total"]
        self.assertEqual(user_count, 0)
        self.assertEqual(self.demo_login().status_code, 404)

    def test_demo_role_switch_and_instructor_permissions(self):
        self.assertEqual(self.demo_login().status_code, 200)
        self.assertEqual(self.client.get("/api/instructor/classrooms").status_code, 403)
        self.assertEqual(self.demo_login("instructor").status_code, 200)
        response = self.client.post(
            "/api/instructor/classrooms",
            json={"name": "Kind Signs Club", "description": "A practice group"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.get_json()["code"])

    def test_signup_login_and_duplicate_email(self):
        response = self.client.post(
            "/api/auth/signup",
            json={"name": "Taylor Learner", "email": "taylor@example.com", "password": "safe-password"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["user"]["role"], "learner")
        onboarding = self.client.put(
            "/api/profile",
            json={
                "name": "Taylor Learner",
                "learner_type": "Parent or caregiver",
                "learning_goal": "Connect with family",
            },
        )
        self.assertEqual(onboarding.status_code, 200)
        self.assertEqual(onboarding.get_json()["user"]["learner_type"], "Parent or caregiver")
        self.assertEqual(onboarding.get_json()["user"]["learning_goal"], "Connect with family")
        duplicate = self.client.post(
            "/api/auth/signup",
            json={"name": "Taylor", "email": "TAYLOR@example.com", "password": "safe-password"},
        )
        self.assertEqual(duplicate.status_code, 409)
        self.client.post("/api/auth/logout")
        valid_login = self.client.post(
            "/api/auth/login",
            json={"email": "taylor@example.com", "password": "safe-password"},
        )
        self.assertEqual(valid_login.status_code, 200)
        invalid_login = self.client.post(
            "/api/auth/login",
            json={"email": "taylor@example.com", "password": "incorrect"},
        )
        self.assertEqual(invalid_login.status_code, 401)

    def test_password_values_match_postgres_text_columns(self):
        salt, password_hash = backend.stored_password_values("00ff", "abcd")
        self.assertEqual(salt, "00ff")
        self.assertEqual(password_hash, "abcd")

    def test_signup_rejects_values_outside_supported_limits(self):
        response = self.client.post(
            "/api/auth/signup",
            json={"name": "Taylor", "email": "taylor@example.com", "password": "p" * 129},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("8 and 128", response.get_json()["error"])

    def test_google_sign_in_requires_server_credentials(self):
        with patch.object(backend, "GOOGLE_CLIENT_ID", ""), patch.object(
            backend, "GOOGLE_CLIENT_SECRET", ""
        ):
            response = self.client.get("/api/auth/google")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.headers["Location"],
            f"{backend.FRONTEND_URL}/login?oauth_error=not_configured",
        )

    def test_google_sign_in_redirects_to_provider(self):
        with patch.object(backend, "GOOGLE_CLIENT_ID", "client-id"), patch.object(
            backend, "GOOGLE_CLIENT_SECRET", "client-secret"
        ), patch.object(backend.google, "authorize_redirect", return_value=backend.redirect("https://accounts.google.com")) as authorize:
            response = self.client.get("/api/auth/google?flow=signup")
        self.assertEqual(response.status_code, 302)
        authorize.assert_called_once_with(backend.GOOGLE_REDIRECT_URI)
        with self.client.session_transaction() as browser_session:
            self.assertEqual(browser_session["oauth_flow"], "signup")

    def test_google_sign_in_rejects_invalid_flow(self):
        response = self.client.get("/api/auth/google?flow=admin")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.headers["Location"],
            f"{backend.FRONTEND_URL}/login?oauth_error=invalid_flow",
        )

    def test_google_callback_reports_user_cancellation(self):
        with patch.object(backend, "GOOGLE_CLIENT_ID", "client-id"), patch.object(
            backend, "GOOGLE_CLIENT_SECRET", "client-secret"
        ), patch.object(
            backend.google, "authorize_access_token", side_effect=RuntimeError("OAuth cancelled")
        ):
            with self.client.session_transaction() as browser_session:
                browser_session["oauth_flow"] = "signup"
            response = self.client.get(
                "/api/auth/google/callback?error=access_denied"
            )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.headers["Location"],
            f"{backend.FRONTEND_URL}/signup?oauth_error=cancelled",
        )

    def test_google_callback_creates_account_and_restores_session(self):
        userinfo = {
            "sub": "google-subject-123",
            "email": "new.google@example.com",
            "email_verified": True,
            "name": "Google Learner",
        }
        with patch.object(backend, "GOOGLE_CLIENT_ID", "client-id"), patch.object(
            backend, "GOOGLE_CLIENT_SECRET", "client-secret"
        ), patch.object(backend.google, "authorize_access_token", return_value={"userinfo": userinfo}):
            with self.client.session_transaction() as browser_session:
                browser_session["oauth_flow"] = "signup"
            response = self.client.get("/api/auth/google/callback")

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], f"{backend.FRONTEND_URL}/profile/setup")
        current_user = self.client.get("/api/auth/me")
        self.assertEqual(current_user.status_code, 200)
        self.assertEqual(current_user.get_json()["user"]["email"], userinfo["email"])
        onboarding = self.client.put(
            "/api/profile",
            json={
                "name": "Google Learner",
                "learner_type": "Adult learner",
                "learning_goal": "Everyday conversations",
            },
        )
        self.assertEqual(onboarding.status_code, 200)
        self.assertEqual(onboarding.get_json()["user"]["learning_goal"], "Everyday conversations")

    def test_google_login_requires_an_existing_talinturo_account(self):
        userinfo = {
            "sub": "new-google-subject",
            "email": "new.google@example.com",
            "email_verified": True,
            "name": "Google Learner",
        }
        with patch.object(backend, "GOOGLE_CLIENT_ID", "client-id"), patch.object(
            backend, "GOOGLE_CLIENT_SECRET", "client-secret"
        ), patch.object(backend.google, "authorize_access_token", return_value={"userinfo": userinfo}):
            with self.client.session_transaction() as browser_session:
                browser_session["oauth_flow"] = "login"
            response = self.client.get("/api/auth/google/callback")

        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.headers["Location"],
            f"{backend.FRONTEND_URL}/login?oauth_error=account_not_found",
        )
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_google_login_redirects_existing_account_to_workspace(self):
        userinfo = {
            "sub": "instructor-google-subject",
            "email": "teacher@example.com",
            "email_verified": True,
            "name": "Jamie Santos",
        }
        with patch.object(backend, "GOOGLE_CLIENT_ID", "client-id"), patch.object(
            backend, "GOOGLE_CLIENT_SECRET", "client-secret"
        ), patch.object(backend.google, "authorize_access_token", return_value={"userinfo": userinfo}):
            with self.client.session_transaction() as browser_session:
                browser_session["oauth_flow"] = "login"
            response = self.client.get("/api/auth/google/callback")

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], f"{backend.FRONTEND_URL}/instructor")
        self.assertEqual(self.client.get("/api/auth/me").get_json()["user"]["role"], "instructor")

    def test_google_callback_fetches_userinfo_when_token_omits_it(self):
        userinfo = {
            "sub": "fallback-google-subject",
            "email": "fallback.google@example.com",
            "email_verified": True,
            "name": "Fallback Learner",
        }
        with patch.object(backend, "GOOGLE_CLIENT_ID", "client-id"), patch.object(
            backend, "GOOGLE_CLIENT_SECRET", "client-secret"
        ), patch.object(
            backend.google, "authorize_access_token", return_value={}
        ), patch.object(backend.google, "userinfo", return_value=userinfo) as fetch_userinfo:
            with self.client.session_transaction() as browser_session:
                browser_session["oauth_flow"] = "signup"
            response = self.client.get("/api/auth/google/callback")

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], f"{backend.FRONTEND_URL}/profile/setup")
        fetch_userinfo.assert_called_once_with()
        self.assertEqual(self.client.get("/api/auth/me").get_json()["user"]["email"], userinfo["email"])

    def test_google_sign_in_rejects_unverified_email(self):
        with self.assertRaises(ValueError):
            backend.get_or_create_google_user(
                {"sub": "unverified", "email": "person@example.com", "email_verified": False}
            )

    def test_google_sign_in_links_verified_existing_account(self):
        existing = self.client.post(
            "/api/auth/signup",
            json={"name": "Existing Learner", "email": "existing@example.com", "password": "safe-password"},
        ).get_json()["user"]
        with backend.app.app_context():
            linked = backend.get_or_create_google_user(
                {
                    "sub": "google-existing-user",
                    "email": "EXISTING@example.com",
                    "email_verified": True,
                    "name": "Google Name",
                }
            )
            user_count = backend.get_db().execute("SELECT COUNT(*) FROM users").fetchone()[0]
        self.assertEqual(linked["id"], existing["id"])
        self.assertEqual(user_count, 3)

    def test_progress_requires_session_and_published_activity(self):
        self.assertEqual(
            self.client.post("/api/progress/complete", json={"activity": "practice", "score": 90}).status_code,
            401,
        )
        self.demo_login()
        invalid = self.client.post("/api/progress/complete", json={"response": {"answers": []}})
        self.assertEqual(invalid.status_code, 400)
        unavailable = self.client.post(
            "/api/progress/complete",
            json={"activity_id": 1, "response": {"answers": []}},
        )
        self.assertEqual(unavailable.status_code, 404)

    def test_lesson_progress_requires_login_and_valid_in_progress_percentage(self):
        response = self.client.put(
            "/api/lessons/1/progress",
            json={"progress_percent": 25},
        )
        self.assertEqual(response.status_code, 401)

        self.demo_login()
        for invalid_progress in (None, True, 0, 100, 25.5, "25"):
            with self.subTest(progress_percent=invalid_progress):
                response = self.client.put(
                    "/api/lessons/1/progress",
                    json={"progress_percent": invalid_progress},
                )
                self.assertEqual(response.status_code, 400)

        unavailable = self.client.put(
            "/api/lessons/1/progress",
            json={"progress_percent": 25},
        )
        self.assertEqual(unavailable.status_code, 404)

    def test_learning_content_endpoints_read_postgres_content(self):
        self.demo_login()
        for endpoint in ("/api/paths", "/api/vocabulary", "/api/scenarios", "/api/challenges"):
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 200)

    def test_learning_path_returns_lesson_media_urls(self):
        self.demo_login()
        with backend.app.app_context():
            db = backend.get_db()
            path_id = backend.insert_id(
                db,
                "INSERT INTO learning_paths(slug, title, description, level, is_published) "
                "VALUES(?, ?, ?, ?, TRUE)",
                ("greetings", "Greetings", "Start here", "Starter"),
                backend.PATH_PK,
            )
            backend.insert_id(
                db,
                "INSERT INTO lessons(path_id, slug, title, duration_minutes, content, image_url, video_url) "
                "VALUES(?, ?, ?, ?, ?, ?, ?)",
                (
                    path_id,
                    "hello",
                    "Hello",
                    "5:00",
                    backend.Jsonb({"sections": []}),
                    "https://cdn.example/hello.jpg",
                    "https://cdn.example/hello.mp4",
                ),
                backend.LESSON_PK,
            )
            db.commit()
        response = self.client.get(f"/api/paths/{path_id}")
        self.assertEqual(response.status_code, 200)
        lesson = response.get_json()["lessons"][0]
        self.assertEqual(lesson["image_url"], "https://cdn.example/hello.jpg")
        self.assertEqual(lesson["video_url"], "https://cdn.example/hello.mp4")

    def test_database_connection_error_gives_configuration_guidance(self):
        self.demo_login()
        with patch.object(
            backend,
            "get_db",
            side_effect=backend.DatabaseConnectionError("connection unavailable"),
        ):
            response = self.client.get("/api/paths")
        self.assertEqual(response.status_code, 503)
        self.assertIn("DATABASE_URL", response.get_json()["error"])
        self.assertTrue(response.get_json()["missing_data"])

    def test_data_readiness_reports_postgres_configuration(self):
        self.demo_login()
        response = self.client.get("/api/data/readiness")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["missing_data"][0]["table"], "learning_paths")

    def test_instructor_can_add_a_learner_once(self):
        self.client.post(
            "/api/auth/signup",
            json={"name": "Sam Rivera", "email": "sam@example.com", "password": "safe-password"},
        )
        self.demo_login("instructor")
        classrooms = self.client.get("/api/instructor/classrooms").get_json()["classrooms"]
        classroom_id = classrooms[0]["id"]
        response = self.client.post(
            f"/api/instructor/classrooms/{classroom_id}/students",
            json={"name": "Sam Rivera", "email": "sam@example.com"},
        )
        self.assertEqual(response.status_code, 201)
        duplicate = self.client.post(
            f"/api/instructor/classrooms/{classroom_id}/students",
            json={"name": "Sam R.", "email": "SAM@example.com"},
        )
        self.assertEqual(duplicate.status_code, 409)
        roster = self.client.get(
            f"/api/instructor/classrooms/{classroom_id}/students"
        ).get_json()
        self.assertEqual(len(roster["students"]), 1)

    def test_classroom_join_routes_require_a_learner(self):
        self.assertEqual(self.client.get("/api/classrooms").status_code, 401)
        self.assertEqual(
            self.client.post("/api/classrooms/join", json={"code": "SUNNY24"}).status_code,
            401,
        )

        self.demo_login("instructor")
        self.assertEqual(self.client.get("/api/classrooms").status_code, 403)
        self.assertEqual(
            self.client.post("/api/classrooms/join", json={"code": "SUNNY24"}).status_code,
            403,
        )

        self.demo_login("learner")
        response = self.client.get("/api/classrooms")
        self.assertEqual(response.status_code, 200)
        join_response = self.client.post(
            "/api/classrooms/join", json={"code": "SUNNY24"}
        )
        self.assertEqual(join_response.status_code, 201)

    def test_learner_joins_classroom_with_invite_code(self):
        self.demo_login("learner")
        with backend.app.app_context():
            classroom = backend.get_db().execute(
                "SELECT classroom_id, invite_code FROM classrooms LIMIT 1"
            ).fetchone()
        joined = self.client.post(
            "/api/classrooms/join",
            json={"code": classroom["invite_code"].lower()},
        )
        self.assertEqual(joined.status_code, 201)
        self.assertEqual(joined.get_json()["classroom"]["id"], classroom["classroom_id"])

        listing = self.client.get("/api/classrooms")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(len(listing.get_json()["classrooms"]), 1)

        duplicate = self.client.post(
            "/api/classrooms/join", json={"code": classroom["invite_code"]}
        )
        self.assertEqual(duplicate.status_code, 409)

    def test_profile_updates_name_and_learning_preferences(self):
        self.demo_login()
        response = self.client.put(
            "/api/profile",
            json={
                "name": "Alex Learner",
                "learner_type": "Parent or caregiver",
                "learning_goal": "Connect with family",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["name"], "Alex Learner")
        self.assertEqual(response.get_json()["user"]["learner_type"], "Parent or caregiver")

    def test_account_preferences_are_saved_and_loaded(self):
        self.demo_login()
        defaults = self.client.get("/api/preferences")
        self.assertEqual(defaults.status_code, 200)
        self.assertEqual(defaults.get_json()["preferences"]["theme_mode"], "light")

        updated = self.client.put(
            "/api/preferences",
            json={
                "theme_mode": "dark",
                "sound": True,
                "reduced_motion": True,
                "weekly_summary": True,
            },
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.get_json()["preferences"]["theme_mode"], "dark")
        self.assertEqual(updated.get_json()["preferences"]["reduced_motion"], 1)

        self.client.post("/api/auth/logout")
        self.demo_login()
        loaded = self.client.get("/api/preferences").get_json()["preferences"]
        self.assertEqual(loaded["theme_mode"], "dark")

    def test_preferences_reject_invalid_values(self):
        self.demo_login()
        response = self.client.put(
            "/api/preferences",
            json={
                "theme_mode": "blue",
                "sound": True,
                "reduced_motion": False,
                "weekly_summary": False,
            },
        )
        self.assertEqual(response.status_code, 400)


    def onboarding_values(self, **changes):
        return {"nickname": "Josh", "birthdate": "2000-03-18", "daily_goal_minutes": 10,
                "motivation": "Family Communication", "sensory_preference": "haptics", "class_code": "", **changes}

    def test_onboarding_requires_authentication(self):
        self.assertEqual(self.client.get("/api/onboarding").status_code, 401)
        self.assertEqual(self.client.put("/api/onboarding", json=self.onboarding_values()).status_code, 401)
        self.assertEqual(self.client.post("/api/onboarding/classroom", json={"code": "SUNNY24"}).status_code, 401)

    def test_onboarding_is_initially_empty(self):
        self.demo_login()
        self.assertIsNone(self.client.get("/api/onboarding").get_json()["onboarding"])

    def test_onboarding_persists_across_logout_and_login(self):
        self.demo_login()
        saved = self.client.put("/api/onboarding", json=self.onboarding_values())
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.get_json()["user"]["name"], "Josh")
        self.assertFalse(saved.get_json()["preferences"]["sound"])
        self.client.post("/api/auth/logout")
        self.assertEqual(self.client.post("/api/auth/login", json={"email": "learner@example.com", "password": "safe-password"}).status_code, 200)
        loaded = self.client.get("/api/onboarding").get_json()["onboarding"]
        for key, value in self.onboarding_values().items():
            self.assertEqual(loaded[key] or "", value)
        self.assertTrue(loaded["completed_at"])
        self.assertEqual(self.client.get("/api/auth/me").get_json()["user"]["name"], "Josh")

    def test_onboarding_code_check_does_not_enroll_or_save(self):
        self.demo_login()
        result = self.client.post("/api/onboarding/classroom", json={"code": " sunny24 "})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.get_json()["classroom"]["code"], "SUNNY24")
        self.assertEqual(self.client.get("/api/classrooms").get_json()["classrooms"], [])
        self.assertIsNone(self.client.get("/api/onboarding").get_json()["onboarding"])

    def test_onboarding_enrollment_and_repeated_finish_are_idempotent(self):
        self.demo_login()
        for _ in range(2):
            result = self.client.put("/api/onboarding", json=self.onboarding_values(class_code=" sunny24 ", sensory_preference="audio"))
            self.assertEqual(result.status_code, 200)
            self.assertTrue(result.get_json()["preferences"]["sound"])
        self.assertEqual(len(self.client.get("/api/classrooms").get_json()["classrooms"]), 1)
        saved = self.client.get("/api/onboarding").get_json()["onboarding"]
        self.assertEqual(saved["class_code"], "SUNNY24")
        self.assertEqual(saved["classroom_name"], "Sunshine Sign Stars")

    def test_onboarding_rejects_malformed_and_invalid_fields_without_writes(self):
        self.demo_login()
        invalid = [None, [], "bad", {}, self.onboarding_values(nickname=" "), self.onboarding_values(nickname="n" * 71),
                   self.onboarding_values(birthdate="2001-02-29"), self.onboarding_values(birthdate="2999-01-01"),
                   self.onboarding_values(birthdate=[]), self.onboarding_values(daily_goal_minutes=True),
                   self.onboarding_values(daily_goal_minutes=7), self.onboarding_values(daily_goal_minutes="10"),
                   self.onboarding_values(motivation="Unknown"), self.onboarding_values(sensory_preference="unknown"),
                   self.onboarding_values(class_code=1), self.onboarding_values(class_code="a" * 101)]
        for values in invalid:
            with self.subTest(values=values):
                self.assertEqual(self.client.put("/api/onboarding", json=values).status_code, 400)
        self.assertIsNone(self.client.get("/api/onboarding").get_json()["onboarding"])
        self.assertEqual(self.client.get("/api/auth/me").get_json()["user"]["name"], "Alex Rivera")

    def test_onboarding_rejects_missing_and_inactive_classrooms(self):
        self.demo_login()
        self.assertEqual(self.client.put("/api/onboarding", json=self.onboarding_values(class_code="MISSING")).status_code, 404)
        with backend.app.app_context():
            db = backend.get_db()
            db.execute("UPDATE classrooms SET is_active = FALSE")
            db.commit()
        self.assertEqual(self.client.post("/api/onboarding/classroom", json={"code": "SUNNY24"}).status_code, 404)
        self.assertEqual(self.client.put("/api/onboarding", json=self.onboarding_values(class_code="SUNNY24")).status_code, 404)
        self.assertIsNone(self.client.get("/api/onboarding").get_json()["onboarding"])

    def test_onboarding_rechecks_code_after_preview(self):
        self.demo_login()
        self.assertEqual(self.client.post("/api/onboarding/classroom", json={"code": "SUNNY24"}).status_code, 200)
        with backend.app.app_context():
            db = backend.get_db()
            db.execute("UPDATE classrooms SET is_active = FALSE")
            db.commit()
        self.assertEqual(self.client.put("/api/onboarding", json=self.onboarding_values(class_code="SUNNY24")).status_code, 404)

    def test_onboarding_preserves_unrelated_preferences_and_profile_fields(self):
        self.demo_login()
        self.client.put("/api/preferences", json={"theme_mode": "dark", "sound": True, "reduced_motion": True, "weekly_summary": True})
        saved = self.client.put("/api/onboarding", json=self.onboarding_values()).get_json()
        self.assertEqual(saved["preferences"], {"theme_mode": "dark", "sound": False, "reduced_motion": True, "weekly_summary": True})
        self.assertEqual(saved["user"]["learner_type"], "Adult learner")
        self.assertEqual(saved["user"]["learning_goal"], "Everyday conversations")

    def test_onboarding_cannot_read_or_update_another_account(self):
        self.demo_login()
        self.client.put("/api/onboarding", json=self.onboarding_values())
        self.demo_login("instructor")
        self.assertIsNone(self.client.get("/api/onboarding").get_json()["onboarding"])
        self.assertEqual(self.client.post("/api/onboarding/classroom", json={"code": "SUNNY24"}).status_code, 403)
        self.assertEqual(self.client.put("/api/onboarding", json=self.onboarding_values(class_code="SUNNY24")).status_code, 403)

    def test_onboarding_rolls_back_all_writes_on_database_error(self):
        self.demo_login()
        execute = backend.PostgresDatabase.execute
        def fail_preferences(db, sql, params=()):
            if sql.startswith("INSERT INTO user_preferences"):
                raise backend.psycopg.OperationalError("Simulated transaction failure")
            return execute(db, sql, params)
        with patch.object(backend.PostgresDatabase, "execute", fail_preferences):
            with self.assertRaises(backend.psycopg.OperationalError):
                self.client.put("/api/onboarding", json=self.onboarding_values(class_code="SUNNY24"))
        self.assertIsNone(self.client.get("/api/onboarding").get_json()["onboarding"])
        self.assertEqual(self.client.get("/api/classrooms").get_json()["classrooms"], [])
        self.assertEqual(self.client.get("/api/auth/me").get_json()["user"]["name"], "Alex Rivera")

    def test_onboarding_skipping_class_does_not_remove_existing_memberships(self):
        self.demo_login()
        self.client.post("/api/classrooms/join", json={"code": "SUNNY24"})
        self.assertEqual(self.client.put("/api/onboarding", json=self.onboarding_values()).status_code, 200)
        self.assertEqual(len(self.client.get("/api/classrooms").get_json()["classrooms"]), 1)


    def avatar_lesson(self, progress=50):
        with backend.app.app_context():
            db = backend.get_db()
            path_id = backend.insert_id(db, "INSERT INTO learning_paths(slug, title, is_published) VALUES(?, ?, TRUE)", ("avatar-test-path", "Test"), backend.PATH_PK)
            lesson_id = backend.insert_id(db, "INSERT INTO lessons(path_id, slug, title, content, is_published) VALUES(?, ?, ?, ?, TRUE)", (path_id, "avatar-test-lesson", "Test lesson", backend.Jsonb({"sections": [{"title": "Test", "body": "Fixture"}]})), backend.LESSON_PK)
            user_id = db.execute("SELECT user_id FROM users WHERE email = ?", ("learner@example.com",)).fetchone()["user_id"]
            db.execute("INSERT INTO lesson_progress(user_id, lesson_id, progress_percent) VALUES(?, ?, ?)", (user_id, lesson_id, progress))
            db.commit()
        return lesson_id

    def avatar_complete(self, lesson_id):
        return self.client.post(f"/api/lessons/{lesson_id}/practice/complete", json={"answers": ["lesson"], "practice_confirmed": True})

    def test_avatar_authentication_and_zero_default(self):
        self.assertEqual(self.client.get("/api/avatar").status_code, 401)
        self.assertEqual(self.client.put("/api/avatar", json={}).status_code, 401)
        self.assertEqual(self.client.post("/api/avatar/purchases", json={}).status_code, 401)
        self.demo_login()
        value = self.client.get("/api/avatar").get_json()["avatar"]
        self.assertEqual((value["character"], value["balance"], value["equipped"], value["owned"]), ("algwas", 0, {}, []))

    def test_avatar_first_completion_awards_once_and_no_backfill(self):
        self.demo_login()
        lesson = self.avatar_lesson()
        self.assertEqual(self.avatar_complete(lesson).get_json()["xp_earned"], 15)
        self.assertEqual(self.avatar_complete(lesson).get_json()["xp_earned"], 0)
        self.assertEqual(self.client.get("/api/avatar").get_json()["avatar"]["balance"], 15)

    def test_avatar_old_completed_lesson_does_not_earn_again(self):
        self.demo_login()
        self.assertEqual(self.avatar_complete(self.avatar_lesson(100)).get_json()["xp_earned"], 0)

    def test_avatar_incomplete_and_wrong_quiz_no_reward(self):
        self.demo_login()
        lesson = self.avatar_lesson()
        self.assertEqual(self.client.post(f"/api/lessons/{lesson}/practice/complete", json={"answers": ["review"], "practice_confirmed": True}).get_json()["completed"], False)
        self.assertEqual(self.client.post(f"/api/lessons/{lesson}/practice/complete", json={"answers": ["lesson"], "practice_confirmed": False}).status_code, 400)
        self.assertEqual(self.client.get("/api/avatar").get_json()["avatar"]["balance"], 0)

    def test_avatar_purchase_ownership_and_idempotency(self):
        self.demo_login()
        self.assertEqual(self.client.post("/api/avatar/purchases", json={"item_id": "beanie"}).status_code, 409)
        self.avatar_complete(self.avatar_lesson())
        for _ in range(2):
            value = self.client.post("/api/avatar/purchases", json={"item_id": "beanie"}).get_json()["avatar"]
            self.assertEqual(value["balance"], 0)
            self.assertEqual(value["owned"], ["beanie"])
        self.assertEqual(self.client.post("/api/avatar/purchases", json={"item_id": "glasses"}).status_code, 409)

    def test_avatar_rejects_price_tampering_and_unowned_equipment(self):
        self.demo_login()
        for value in [None, [], {"item_id": "unknown"}, {"item_id": "beanie", "cost": 0}, {"item_id": "beanie", "user_id": 1}]:
            self.assertEqual(self.client.post("/api/avatar/purchases", json=value).status_code, 400)
        for value in [{"character": "fake", "equipped": {}}, {"character": "algwas", "equipped": {"head": "beanie"}}, {"character": "algwas", "equipped": []}, {"character": "connie", "equipped": {}, "balance": 999}]:
            self.assertEqual(self.client.put("/api/avatar", json=value).status_code, 400)

    def test_avatar_save_switch_unequip_and_account_isolation(self):
        self.demo_login()
        self.avatar_complete(self.avatar_lesson())
        self.client.post("/api/avatar/purchases", json={"item_id": "beanie"})
        for character in backend.AVATAR_CHARACTERS:
            self.assertEqual(self.client.put("/api/avatar", json={"character": character, "equipped": {"head": "beanie"}}).status_code, 200)
        self.assertEqual(self.client.put("/api/avatar", json={"character": "orange", "equipped": {"eyes": "beanie"}}).status_code, 400)
        self.client.post("/api/auth/logout")
        self.client.post("/api/auth/login", json={"email": "learner@example.com", "password": "safe-password"})
        self.assertEqual(self.client.get("/api/avatar").get_json()["avatar"]["equipped"], {"head": "beanie"})
        self.client.put("/api/avatar", json={"character": "connie", "equipped": {}})
        self.assertEqual(self.client.get("/api/avatar").get_json()["avatar"]["equipped"], {})
        self.demo_login("instructor")
        self.assertEqual(self.client.get("/api/avatar").get_json()["avatar"]["owned"], [])

    def test_avatar_concurrent_purchase_cannot_overspend(self):
        from concurrent.futures import ThreadPoolExecutor
        self.demo_login()
        self.avatar_complete(self.avatar_lesson())
        with self.client.session_transaction() as active:
            account = dict(active)
        def purchase(item):
            client = backend.app.test_client()
            with client.session_transaction() as isolated:
                isolated.update(account)
            return client.post("/api/avatar/purchases", json={"item_id": item}).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(purchase, ["beanie", "glasses"])), [200, 409])
        self.assertEqual(self.client.get("/api/avatar").get_json()["avatar"]["balance"], 0)

    def test_avatar_concurrent_completion_awards_once(self):
        from concurrent.futures import ThreadPoolExecutor
        self.demo_login()
        lesson = self.avatar_lesson()
        with self.client.session_transaction() as active:
            account = dict(active)
        def complete(_):
            client = backend.app.test_client()
            with client.session_transaction() as isolated:
                isolated.update(account)
            response = client.post(f"/api/lessons/{lesson}/practice/complete", json={"answers": ["lesson"], "practice_confirmed": True})
            self.assertEqual(response.status_code, 200)
            return response.get_json()["xp_earned"]
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(complete, range(2))), [0, 15])

    def test_avatar_reward_and_completion_rollback_together(self):
        self.demo_login()
        lesson = self.avatar_lesson()
        execute = backend.PostgresDatabase.execute
        def fail_progress(db, statement, params=()):
            if "INSERT INTO lesson_progress" in statement:
                raise backend.psycopg.OperationalError("Simulated progress write failure")
            return execute(db, statement, params)
        with patch.object(backend.PostgresDatabase, "execute", fail_progress):
            with self.assertRaises(backend.psycopg.OperationalError):
                self.avatar_complete(lesson)
        self.assertEqual(self.client.get("/api/avatar").get_json()["avatar"]["balance"], 0)
        self.assertEqual(float(self.client.get(f"/api/lessons/{lesson}").get_json()["lesson"]["progress"]), 50)

    def test_avatar_purchase_rollback_preserves_credit(self):
        self.demo_login()
        self.avatar_complete(self.avatar_lesson())
        with patch.object(backend.PostgresDatabase, "commit", side_effect=backend.psycopg.OperationalError("Simulated commit failure")):
            with self.assertRaises(backend.psycopg.OperationalError):
                self.client.post("/api/avatar/purchases", json={"item_id": "beanie"})
        avatar = self.client.get("/api/avatar").get_json()["avatar"]
        self.assertEqual((avatar["balance"], avatar["owned"]), (15, []))

    def test_avatar_unwatched_lesson_cannot_earn(self):
        self.demo_login()
        self.assertEqual(self.avatar_complete(self.avatar_lesson(0)).status_code, 409)
        self.assertEqual(self.client.get("/api/avatar").get_json()["avatar"]["balance"], 0)


if __name__ == "__main__":
    unittest.main()
