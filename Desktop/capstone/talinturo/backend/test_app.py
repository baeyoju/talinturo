import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import app as backend


class TalinturoApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        backend.DATABASE = Path(self.temp_dir.name) / "test.sqlite3"
        self.previous_demo_mode = backend.DEMO_MODE
        backend.DEMO_MODE = True
        backend.initialize_database()
        backend.app.config["TESTING"] = True
        self.client = backend.app.test_client()

    def tearDown(self):
        backend.DEMO_MODE = self.previous_demo_mode
        self.temp_dir.cleanup()

    def demo_login(self, role="learner"):
        return self.client.post("/api/auth/demo", json={"role": role})

    def test_database_initialization_does_not_seed_sample_accounts_by_default(self):
        backend.DEMO_MODE = False
        backend.DATABASE = Path(self.temp_dir.name) / "empty.sqlite3"
        backend.initialize_database()
        with backend.app.app_context():
            user_count = backend.get_db().execute(
                "SELECT COUNT(*) AS total FROM users"
            ).fetchone()["total"]
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

    def test_password_values_match_postgres_bytea_columns(self):
        with patch.object(backend, "USE_POSTGRES", True):
            salt, password_hash = backend.stored_password_values("00ff", "abcd")
        self.assertEqual(salt, b"\x00\xff")
        self.assertEqual(password_hash, b"\xab\xcd")

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
        self.assertEqual(unavailable.status_code, 503)

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
        self.assertEqual(unavailable.status_code, 503)

    def test_learning_content_endpoints_require_postgres_instead_of_demo_content(self):
        self.demo_login()
        for endpoint in ("/api/paths", "/api/vocabulary", "/api/scenarios", "/api/challenges"):
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 503)
            self.assertIn("PostgreSQL", response.get_json()["error"])
            self.assertTrue(response.get_json()["missing_data"])

    def test_data_readiness_reports_postgres_configuration(self):
        self.demo_login()
        response = self.client.get("/api/data/readiness")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.get_json()["missing_data"][0]["table"], "DATABASE_URL")

    def test_instructor_can_add_a_learner_once(self):
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
                "reminders": False,
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
        self.assertEqual(loaded["reminders"], 0)

    def test_preferences_reject_invalid_values(self):
        self.demo_login()
        response = self.client.put(
            "/api/preferences",
            json={
                "theme_mode": "blue",
                "reminders": True,
                "sound": True,
                "reduced_motion": False,
                "weekly_summary": False,
            },
        )
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
