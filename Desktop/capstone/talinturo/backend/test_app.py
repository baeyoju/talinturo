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
        backend.initialize_database()
        backend.app.config["TESTING"] = True
        self.client = backend.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def demo_login(self, role="learner"):
        return self.client.post("/api/auth/demo", json={"role": role})

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

    def test_progress_requires_session_and_valid_score(self):
        self.assertEqual(
            self.client.post("/api/progress/complete", json={"activity": "practice", "score": 90}).status_code,
            401,
        )
        self.demo_login()
        invalid = self.client.post(
            "/api/progress/complete",
            json={"activity": "practice", "score": 120},
        )
        self.assertEqual(invalid.status_code, 400)
        valid = self.client.post(
            "/api/progress/complete",
            json={"activity": "practice", "score": 90},
        )
        self.assertEqual(valid.status_code, 201)
        self.assertGreaterEqual(len(self.client.get("/api/progress").get_json()["events"]), 1)

    def test_learning_content_endpoints_return_demo_content(self):
        self.demo_login()
        paths = self.client.get("/api/paths").get_json()["paths"]
        vocabulary = self.client.get("/api/vocabulary").get_json()["words"]
        scenarios = self.client.get("/api/scenarios").get_json()["scenarios"]
        self.assertTrue(paths)
        self.assertTrue(vocabulary)
        self.assertTrue(scenarios)
        self.assertIn("lessons", paths[0])

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
