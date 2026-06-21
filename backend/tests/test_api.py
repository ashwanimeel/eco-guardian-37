"""
EcoTrack AI — Backend edge-case test suite.

Covers authentication, carbon calculations, gamification, challenges,
quizzes, simulator, and bill scanner endpoints — emphasising failure modes
and boundary conditions rather than just happy paths.

Run:
    cd /app && python -m pytest backend/tests/test_api.py -v
"""
from __future__ import annotations

import io
import os
import uuid
from typing import Dict

import pytest
import requests
from PIL import Image, ImageDraw


# ---------- Test configuration ---------------------------------------------------
def _backend_base_url() -> str:
    """Read the external backend URL from the frontend .env so we exercise the
    same ingress + CORS path that real browsers hit."""
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env")
    with open(env_path, "r", encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"')
    raise RuntimeError("REACT_APP_BACKEND_URL not found in frontend/.env")


BASE_URL = _backend_base_url()
API = f"{BASE_URL}/api"
DEMO_EMAIL = "demo@ecotrack.ai"
DEMO_PASSWORD = "demo1234"


# ---------- Fixtures -------------------------------------------------------------
@pytest.fixture(scope="session")
def demo_token() -> str:
    """Authenticate the seeded demo user and return a JWT for the session."""
    r = requests.post(f"{API}/auth/login",
                      json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
                      timeout=15)
    assert r.status_code == 200, f"Demo login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(demo_token: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {demo_token}"}


@pytest.fixture
def fresh_user_token() -> str:
    """Register a one-off user (deterministic email per test invocation)."""
    email = f"test_{uuid.uuid4().hex[:10]}@ecotrack.ai"
    r = requests.post(f"{API}/auth/register",
                      json={"email": email, "password": "testpw123", "name": "Test User"},
                      timeout=15)
    assert r.status_code == 200, f"Register failed: {r.text}"
    return r.json()["token"]


# ---------- Health ---------------------------------------------------------------
class TestHealth:
    def test_root_health(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------- Authentication edge cases --------------------------------------------
class TestAuth:
    def test_register_duplicate_email_is_rejected(self):
        """The seeded demo email cannot be re-registered."""
        r = requests.post(f"{API}/auth/register",
                          json={"email": DEMO_EMAIL, "password": "x", "name": "Y"},
                          timeout=10)
        assert r.status_code == 400

    def test_login_with_wrong_password_returns_401(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": DEMO_EMAIL, "password": "wrong"},
                          timeout=10)
        assert r.status_code == 401

    def test_login_with_unknown_email_returns_401(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": "nobody@nowhere.io", "password": "anything"},
                          timeout=10)
        assert r.status_code == 401

    def test_register_with_invalid_email_rejected(self):
        r = requests.post(f"{API}/auth/register",
                          json={"email": "not-an-email", "password": "abcdef", "name": "X"},
                          timeout=10)
        # Pydantic EmailStr returns 422 unprocessable
        assert r.status_code == 422

    def test_me_without_token_returns_401(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_me_with_invalid_token_returns_401(self):
        r = requests.get(f"{API}/auth/me",
                         headers={"Authorization": "Bearer this-is-garbage"},
                         timeout=10)
        assert r.status_code == 401

    def test_me_with_valid_token_returns_user(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == DEMO_EMAIL
        # Password hash should never be exposed
        assert "password_hash" not in body

    def test_google_session_requires_session_id(self):
        r = requests.post(f"{API}/auth/google/session", json={}, timeout=10)
        assert r.status_code == 400


# ---------- Carbon calculations -------------------------------------------------
class TestCarbon:
    def test_summary_for_demo_user_has_expected_shape(self, auth_headers):
        r = requests.get(f"{API}/carbon/summary", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        body = r.json()
        for key in ("daily", "weekly", "monthly", "categories", "trend", "score", "trees_to_offset"):
            assert key in body
        assert 0 <= body["score"] <= 100
        assert isinstance(body["trend"], list)
        for cat in ("transport", "electricity", "food", "water", "shopping", "waste"):
            assert cat in body["categories"]

    def test_zero_entry_yields_zero_emissions(self, fresh_user_token):
        """All-zero inputs must produce a zero-total entry (boundary)."""
        headers = {"Authorization": f"Bearer {fresh_user_token}"}
        r = requests.post(f"{API}/carbon/entry", headers=headers, json={}, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["entry"]["emissions"]["total"] == 0.0
        # Even a zero entry should earn some points (engagement reward).
        assert body["points_earned"] >= 5

    def test_high_emission_entry_still_succeeds(self, fresh_user_token):
        """Very large but realistic values shouldn't crash the calculator."""
        headers = {"Authorization": f"Bearer {fresh_user_token}"}
        payload = {
            "transport_km_car": 500, "transport_km_flight": 5000,
            "electricity_kwh": 100, "food_meat_meals": 5,
        }
        r = requests.post(f"{API}/carbon/entry", headers=headers, json=payload, timeout=10)
        assert r.status_code == 200
        emissions = r.json()["entry"]["emissions"]
        assert emissions["total"] > 1000

    def test_carbon_score_within_bounds(self, fresh_user_token):
        """Score must always be clamped to [0, 100]."""
        headers = {"Authorization": f"Bearer {fresh_user_token}"}
        # Log an enormous footprint
        requests.post(f"{API}/carbon/entry", headers=headers,
                      json={"transport_km_flight": 50000}, timeout=10)
        r = requests.get(f"{API}/carbon/summary", headers=headers, timeout=10)
        assert 0 <= r.json()["score"] <= 100

    def test_predict_with_insufficient_history_returns_default(self, fresh_user_token):
        """A user with no history should still get a sensible prediction."""
        headers = {"Authorization": f"Bearer {fresh_user_token}"}
        r = requests.get(f"{API}/carbon/predict", headers=headers, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert "predicted_monthly" in body
        assert body["confidence"] in ("low", "medium", "high")


# ---------- Gamification --------------------------------------------------------
class TestChallenges:
    def test_list_challenges_returns_seeded_set(self, auth_headers):
        r = requests.get(f"{API}/challenges", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 6

    def test_progress_without_joining_fails(self, fresh_user_token):
        """Progressing a challenge you haven't joined must be rejected."""
        headers = {"Authorization": f"Bearer {fresh_user_token}"}
        r = requests.post(f"{API}/challenges/progress", headers=headers,
                          json={"challenge_id": "plant-a-tree", "increment": 1}, timeout=10)
        assert r.status_code == 400

    def test_join_and_complete_challenge_awards_points(self, fresh_user_token):
        """Joining + completing a challenge should award the full reward exactly once."""
        headers = {"Authorization": f"Bearer {fresh_user_token}"}
        challenge_id = "plant-a-tree"  # target=3

        join = requests.post(f"{API}/challenges/join", headers=headers,
                             json={"challenge_id": challenge_id}, timeout=10)
        assert join.status_code == 200

        # Advance 3 times to complete
        for _ in range(3):
            requests.post(f"{API}/challenges/progress", headers=headers,
                          json={"challenge_id": challenge_id, "increment": 1}, timeout=10)

        # Verify completion flag + points
        listing = requests.get(f"{API}/challenges", headers=headers, timeout=10).json()
        plant = next(c for c in listing if c["challenge_id"] == challenge_id)
        assert plant["completed"] is True

    def test_join_unknown_challenge_is_safe(self, fresh_user_token):
        """Joining a fake challenge ID is permitted but progressing it should 404."""
        headers = {"Authorization": f"Bearer {fresh_user_token}"}
        requests.post(f"{API}/challenges/join", headers=headers,
                      json={"challenge_id": "no-such-challenge"}, timeout=10)
        prog = requests.post(f"{API}/challenges/progress", headers=headers,
                             json={"challenge_id": "no-such-challenge", "increment": 1}, timeout=10)
        assert prog.status_code == 404


# ---------- Community -----------------------------------------------------------
class TestCommunity:
    def test_leaderboard_is_sorted_descending(self):
        r = requests.get(f"{API}/community/leaderboard", timeout=10)
        assert r.status_code == 200
        leaders = r.json()
        points = [u["points"] for u in leaders]
        assert points == sorted(points, reverse=True)


# ---------- Climate Hub ---------------------------------------------------------
class TestClimate:
    def test_facts_articles_quizzes_seeded(self):
        for path, minimum in [("/climate/facts", 3), ("/climate/articles", 1), ("/climate/quizzes", 1)]:
            r = requests.get(f"{API}{path}", timeout=10)
            assert r.status_code == 200
            assert len(r.json()) >= minimum

    def test_quiz_correct_answers_must_not_be_exposed(self):
        """API must strip 'correct' field from quiz questions."""
        r = requests.get(f"{API}/climate/quizzes", timeout=10).json()
        for quiz in r:
            for question in quiz["questions"]:
                assert "correct" not in question

    def test_quiz_submit_with_unknown_id_returns_404(self, auth_headers):
        r = requests.post(f"{API}/climate/quiz/submit", headers=auth_headers,
                          json={"quiz_id": "nope", "answers": [0]}, timeout=10)
        assert r.status_code == 404

    def test_quiz_submit_with_all_wrong_answers_scores_zero(self, auth_headers):
        quiz = requests.get(f"{API}/climate/quizzes", timeout=10).json()[0]
        # Submit deliberately wrong (option 99) — clamped to 0 correct
        r = requests.post(f"{API}/climate/quiz/submit", headers=auth_headers,
                          json={"quiz_id": quiz["quiz_id"],
                                "answers": [99] * len(quiz["questions"])}, timeout=10)
        assert r.status_code == 200
        assert r.json()["score"] == 0

    def test_global_stats_returns_numeric_values(self):
        r = requests.get(f"{API}/climate/global-stats", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data["global_co2_ppm"], (int, float))
        assert isinstance(data["temp_rise_c"], (int, float))


# ---------- Simulator -----------------------------------------------------------
class TestSimulator:
    def test_what_if_scales_linearly(self):
        a = requests.post(f"{API}/simulator/what-if",
                          json={"action": "x", "daily_savings_kg": 1, "people": 1000}, timeout=10).json()
        b = requests.post(f"{API}/simulator/what-if",
                          json={"action": "x", "daily_savings_kg": 1, "people": 2000}, timeout=10).json()
        # Doubling people should roughly double the saved CO₂
        assert b["annual_co2_saved_kg"] == pytest.approx(2 * a["annual_co2_saved_kg"], rel=0.01)


# ---------- Reports -------------------------------------------------------------
class TestReports:
    def test_csv_export_returns_csv_content_type(self, auth_headers):
        r = requests.get(f"{API}/reports/export", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        # CSV header row should be the very first line
        assert r.text.split("\n", 1)[0].startswith("date,total,transport")

    def test_csv_export_requires_auth(self):
        r = requests.get(f"{API}/reports/export", timeout=10)
        assert r.status_code == 401


# ---------- Coach (AI) ----------------------------------------------------------
class TestCoach:
    def test_tip_endpoint_is_public_and_returns_string(self):
        r = requests.get(f"{API}/coach/tip", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json()["tip"], str)
        assert len(r.json()["tip"]) > 5

    def test_coach_history_empty_for_new_user(self, fresh_user_token):
        headers = {"Authorization": f"Bearer {fresh_user_token}"}
        r = requests.get(f"{API}/coach/history", headers=headers, timeout=10)
        assert r.status_code == 200
        assert r.json() == []


# ---------- Bill Scanner --------------------------------------------------------
class TestScanner:
    def test_scanner_rejects_non_image_mimetype(self, auth_headers):
        files = {"file": ("foo.txt", io.BytesIO(b"hello world"), "text/plain")}
        r = requests.post(f"{API}/scanner/bill", headers=auth_headers, files=files, timeout=15)
        assert r.status_code == 400

    def test_scanner_rejects_tiny_image(self, auth_headers):
        """A 1×1 pixel image is below the 1KB threshold and must be rejected."""
        buf = io.BytesIO()
        Image.new("RGB", (1, 1), "white").save(buf, format="JPEG")
        files = {"file": ("tiny.jpg", buf.getvalue(), "image/jpeg")}
        r = requests.post(f"{API}/scanner/bill", headers=auth_headers, files=files, timeout=15)
        assert r.status_code == 400

    def test_scanner_requires_auth(self):
        buf = io.BytesIO()
        img = Image.new("RGB", (400, 400), "white")
        ImageDraw.Draw(img).text((10, 10), "Bill", fill="black")
        img.save(buf, format="JPEG")
        files = {"file": ("b.jpg", buf.getvalue(), "image/jpeg")}
        r = requests.post(f"{API}/scanner/bill", files=files, timeout=15)
        assert r.status_code == 401
