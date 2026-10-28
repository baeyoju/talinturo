import sys
import tempfile
import unittest
from pathlib import Path

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


if __name__ == "__main__":
    unittest.main()
