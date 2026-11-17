"""Local-only verification. Never runs the destructive suite on application data.

Run from the repo root with backend/.venv/Scripts/python.exe backend/verify_onboarding.py --browser.
Applies only the additive onboarding/avatar migrations to talinturo_local, then creates
and finally drops a uniquely named disposable test database for all tests.
"""
import logging
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import types
from threading import Thread
import unittest
from urllib.parse import quote

from dotenv import dotenv_values, load_dotenv
import psycopg
from psycopg import sql

ROOT = Path(__file__).resolve().parent.parent


def main():
    load_dotenv(ROOT / ".env")
    configured_uri = dotenv_values(ROOT / ".env").get("DATABASE_URL", "") or ""
    with psycopg.connect(configured_uri, autocommit=True) as local:
        if local.info.host not in ("127.0.0.1", "localhost", "::1") or local.info.dbname != "talinturo_local":
            raise RuntimeError("Refusing: this helper is only for the local talinturo_local database.")
        migration = (ROOT / "migrations/003_user_onboarding.sql").read_text(encoding="utf-8")
        local.execute(migration)
        avatar_migration = (ROOT / "migrations/004_avatar_shop.sql").read_text(encoding="utf-8")
        local.execute(avatar_migration)
        print("Applied additive onboarding/avatar migrations to local talinturo_local; existing account/lesson rows untouched.", flush=True)
        test_name = "talinturo_onboarding_test_" + secrets.token_hex(6)
        params = psycopg.conninfo.conninfo_to_dict(configured_uri)
        password = params.get("password", os.environ.get("PGPASSWORD", ""))
        test_uri = f"postgresql://{quote(local.info.user, safe='')}:{quote(password, safe='')}@127.0.0.1:{local.info.port}/{test_name}"
        local.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(test_name)))
        server = None
        try:
            with psycopg.connect(test_uri, autocommit=True) as disposable:
                disposable.execute((ROOT / "sql/talinturo_schema.sql").read_text(encoding="utf-8"))
                disposable.execute(migration)
                disposable.execute(avatar_migration)
            os.environ["TALINTURO_TEST_DATABASE_URL"] = test_uri
            sys.path.insert(0, str(ROOT))
            suite = unittest.defaultTestLoader.loadTestsFromName("backend.test_app")
            if "--onboarding-only" in sys.argv:
                from backend.test_app import TalinturoApiTests
                suite = unittest.TestSuite(TalinturoApiTests(name) for name in unittest.defaultTestLoader.getTestCaseNames(TalinturoApiTests) if name.startswith("test_onboarding_"))
            if "--avatar-only" in sys.argv:
                from backend.test_app import TalinturoApiTests
                suite = unittest.TestSuite(TalinturoApiTests(name) for name in unittest.defaultTestLoader.getTestCaseNames(TalinturoApiTests) if name.startswith("test_avatar_"))
            if "--browser-only" in sys.argv:
                # Still uses a new disposable database and the existing fixtures.
                import backend.test_app as fixtures
                fixtures.TalinturoApiTests().setUp()
                result = unittest.TestResult()
            else:
                result = unittest.TextTestRunner(verbosity=1).run(suite)
            unit_failed = not result.wasSuccessful()
            if unit_failed:
                # Prove whether failures predate this batch without checking out
                # files or changing the worktree. Run only those original cases.
                current_backend = sys.modules["app"]
                original = types.ModuleType("app")
                original.__file__ = str(ROOT / "backend/app.py")
                original_code = subprocess.check_output(["git", "show", "HEAD:backend/app.py"], cwd=ROOT).decode("utf-8")
                exec(compile(original_code, original.__file__, "exec"), original.__dict__)
                sys.modules["app"] = original
                baseline_tests = types.ModuleType("onboarding_baseline_checks")
                baseline_tests.__file__ = str(ROOT / "backend/test_app.py")
                original_tests = subprocess.check_output(["git", "show", "HEAD:backend/test_app.py"], cwd=ROOT).decode("utf-8")
                exec(compile(original_tests, baseline_tests.__file__, "exec"), baseline_tests.__dict__)
                failed_names = [case._testMethodName for case, _ in result.failures + result.errors]
                baseline = unittest.TestSuite(baseline_tests.TalinturoApiTests(name) for name in failed_names)
                print("Comparing failing cases against untouched HEAD (in memory, same disposable database).", flush=True)
                unittest.TextTestRunner(verbosity=1).run(baseline)
                sys.modules["app"] = current_backend
            if "--browser" in sys.argv or "--browser-only" in sys.argv:
                # Browser acceptance starts from fresh fixtures, not the last API
                # test's purchases. This truncates ONLY our disposable database.
                import backend.test_app as fixtures
                fixtures.TalinturoApiTests().setUp()
                import app as backend
                from werkzeug.serving import make_server
                backend.DATABASE_URL = test_uri
                camera_fixtures = None
                if "--camera-intro" in sys.argv or "--avatar" in sys.argv:
                    # Only this run's disposable database; never seed application lessons.
                    with backend.app.app_context():
                        db = backend.get_db()
                        path_id = backend.insert_id(db, "INSERT INTO learning_paths(slug, title, level, is_published) VALUES(?, ?, ?, TRUE)", ("camera-intro-tests", "Camera intro test fixtures", "Test"), backend.PATH_PK)
                        learner_id = db.execute("SELECT user_id FROM users WHERE email = ?", ("learner@example.com",)).fetchone()["user_id"]
                        camera_fixtures = {"path": path_id}
                        for key, message, progress in (
                            ("authored", "Now that you know how to sign it, let’s use what you’ve learned to help Nanay call Tatay over. Can you do it?", 50),
                            ("other", "Approved text for the second test lesson.", 50),
                            ("missing", None, 50),
                            ("unfinished", "An unfinished test lesson introduction.", 0),
                        ):
                            practice = {} if message is None else {"camera_intro": message}
                            content = {"sections": [{"title": "Test material", "body": "Disposable test fixture, not FSL teaching content."}], "practice": practice}
                            lesson_id = backend.insert_id(db, "INSERT INTO lessons(path_id, slug, title, duration_minutes, content, is_published) VALUES(?, ?, ?, ?, ?, TRUE)", (path_id, key, "Test lesson " + key, "1:00", backend.Jsonb(content)), backend.LESSON_PK)
                            db.execute("INSERT INTO lesson_progress(user_id, lesson_id, status, progress_percent, started_at) VALUES(?, ?, 'in_progress', ?, CURRENT_TIMESTAMP)", (learner_id, lesson_id, progress))
                            camera_fixtures[key] = lesson_id
                        if "--avatar" in sys.argv:
                            camera_fixtures["shop"] = []
                            for index in range(5):
                                lesson_id = backend.insert_id(db, "INSERT INTO lessons(path_id, slug, title, duration_minutes, content, is_published) VALUES(?, ?, ?, ?, ?, TRUE)", (path_id, f"shop-{index}", f"Shop test lesson {index}", "1:00", backend.Jsonb({"sections": [{"title": "Fixture", "body": "Disposable test only."}]})), backend.LESSON_PK)
                                db.execute("INSERT INTO lesson_progress(user_id, lesson_id, status, progress_percent, started_at) VALUES(?, ?, 'in_progress', 50, CURRENT_TIMESTAMP)", (learner_id, lesson_id))
                                camera_fixtures["shop"].append(lesson_id)
                        db.commit()
                logging.getLogger("werkzeug").setLevel(logging.ERROR)
                server = make_server("127.0.0.1", 0, backend.app, threaded=True)
                thread = Thread(target=server.serve_forever, daemon=True)
                thread.start()
                env = {**os.environ, "TALINTURO_BROWSER_API_URL": f"http://127.0.0.1:{server.server_port}"}
                if camera_fixtures:
                    env["TALINTURO_CAMERA_TEST_IDS"] = json.dumps(camera_fixtures)
                    if "shop" in camera_fixtures:
                        env["TALINTURO_AVATAR_TEST_IDS"] = json.dumps(camera_fixtures)
                checked = subprocess.run(["node", "src/features/onboarding/tests/onboarding.browser.js"], cwd=ROOT / "frontend", env=env, check=False)
                return checked.returncode or int(unit_failed)
            return int(unit_failed)
        finally:
            if server:
                server.shutdown()
                server.server_close()
            # Only this invocation's randomly named database can be dropped.
            if not test_name.startswith("talinturo_onboarding_test_"):
                raise RuntimeError("Unexpected cleanup target.")
            local.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid()", (test_name,))
            local.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(test_name)))
            print("Removed this run's disposable test database. Application accounts/data preserved.", flush=True)


if __name__ == "__main__":
    raise SystemExit(main())
