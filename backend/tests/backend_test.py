"""EcoTrack AI backend tests"""
import os, requests, pytest, uuid

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://eco-guardian-37.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

@pytest.fixture(scope="session")
def s():
    return requests.Session()

@pytest.fixture(scope="session")
def auth(s):
    r = s.post(f"{API}/auth/login", json={"email": "demo@ecotrack.ai", "password": "demo1234"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and "user" in data
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return data

# ----- AUTH -----
def test_login_demo(auth):
    assert auth["user"]["email"] == "demo@ecotrack.ai"

def test_login_invalid(s):
    r = requests.post(f"{API}/auth/login", json={"email":"x@y.z","password":"bad"})
    assert r.status_code == 401

def test_register_and_me():
    sess = requests.Session()
    email = f"TEST_{uuid.uuid4().hex[:8]}@t.com"
    r = sess.post(f"{API}/auth/register", json={"email": email, "password":"pass1234","name":"Test"})
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    sess.headers.update({"Authorization": f"Bearer {tok}"})
    me = sess.get(f"{API}/auth/me")
    assert me.status_code == 200 and me.json()["email"] == email

def test_me_unauthed():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401

# ----- CARBON -----
def test_carbon_summary(s, auth):
    r = s.get(f"{API}/carbon/summary")
    assert r.status_code == 200
    d = r.json()
    for k in ["daily","weekly","monthly","categories","trend","score"]:
        assert k in d
    assert isinstance(d["trend"], list)

def test_carbon_predict(s, auth):
    r = s.get(f"{API}/carbon/predict")
    assert r.status_code == 200
    assert "predicted_monthly" in r.json()

def test_carbon_entry_and_persist(s, auth):
    payload = {"transport_km_car":10,"electricity_kwh":5,"food_meat_meals":1,
               "food_veg_meals":2,"water_liters":50,"shopping_usd":10,"waste_kg":0.5,
               "transport_km_bus":0,"transport_km_train":0,"transport_km_flight":0}
    r = s.post(f"{API}/carbon/entry", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "entry" in body and "points_earned" in body
    # Verify persistence
    e = s.get(f"{API}/carbon/entries").json()
    assert any(x["entry_id"] == body["entry"]["entry_id"] for x in e)

# ----- COACH -----
def test_coach_tip():
    r = requests.get(f"{API}/coach/tip")
    assert r.status_code == 200 and "tip" in r.json()

def test_coach_history(s, auth):
    r = s.get(f"{API}/coach/history")
    assert r.status_code == 200 and isinstance(r.json(), list)

# ----- CHALLENGES -----
def test_challenges_flow(s, auth):
    r = s.get(f"{API}/challenges")
    assert r.status_code == 200
    chs = r.json()
    assert len(chs) >= 6
    cid = chs[0]["challenge_id"]
    j = s.post(f"{API}/challenges/join", json={"challenge_id": cid})
    assert j.status_code == 200
    p = s.post(f"{API}/challenges/progress", json={"challenge_id": cid, "increment": 1})
    assert p.status_code == 200 and "progress" in p.json()

# ----- COMMUNITY -----
def test_leaderboard():
    r = requests.get(f"{API}/community/leaderboard")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

# ----- CLIMATE -----
def test_climate_facts():
    r = requests.get(f"{API}/climate/facts")
    assert r.status_code == 200 and len(r.json()) >= 5

def test_climate_articles():
    r = requests.get(f"{API}/climate/articles")
    assert r.status_code == 200 and len(r.json()) >= 3

def test_quizzes_and_submit(s, auth):
    r = requests.get(f"{API}/climate/quizzes")
    assert r.status_code == 200
    qs = r.json()
    assert len(qs) >= 1
    qid = qs[0]["quiz_id"]
    answers = [0]*len(qs[0]["questions"])
    sr = s.post(f"{API}/climate/quiz/submit", json={"quiz_id": qid, "answers": answers})
    assert sr.status_code == 200 and "score" in sr.json()

def test_global_stats():
    r = requests.get(f"{API}/climate/global-stats")
    assert r.status_code == 200 and "global_co2_ppm" in r.json()

# ----- SIMULATOR / REPORTS -----
def test_what_if():
    r = requests.post(f"{API}/simulator/what-if",
                      json={"action":"bike","daily_savings_kg":2,"people":100000})
    assert r.status_code == 200 and "annual_co2_saved_kg" in r.json()

def test_export_csv(s, auth):
    r = s.get(f"{API}/reports/export")
    assert r.status_code == 200
    assert "date,total" in r.text

def test_logout(s, auth):
    r = s.post(f"{API}/auth/logout")
    assert r.status_code == 200
