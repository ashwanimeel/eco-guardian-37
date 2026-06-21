"""EcoTrack AI - FastAPI backend"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Cookie
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, jwt, bcrypt, httpx, json
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="EcoTrack AI")
api = APIRouter(prefix="/api")

logger = logging.getLogger("ecotrack")
logging.basicConfig(level=logging.INFO)

# ========= MODELS =========
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: str = "email"  # email | google
    role: str = "user"  # user | admin
    points: int = 0
    level: str = "Eco Beginner"
    streak: int = 0
    last_active: Optional[str] = None
    badges: List[str] = []
    trees_planted: int = 0
    green_twin: int = 10  # 0-100 greenness
    created_at: str

class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class CarbonEntry(BaseModel):
    transport_km_car: float = 0
    transport_km_bus: float = 0
    transport_km_train: float = 0
    transport_km_flight: float = 0
    electricity_kwh: float = 0
    food_meat_meals: int = 0
    food_veg_meals: int = 0
    water_liters: float = 0
    shopping_usd: float = 0
    waste_kg: float = 0
    note: Optional[str] = ""

class ChatReq(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChallengeJoin(BaseModel):
    challenge_id: str

class ChallengeProgress(BaseModel):
    challenge_id: str
    increment: int = 1

class QuizSubmit(BaseModel):
    quiz_id: str
    answers: List[int]

# ========= EMISSION FACTORS (kg CO2) =========
EF = {
    "car_km": 0.192, "bus_km": 0.089, "train_km": 0.041, "flight_km": 0.255,
    "electricity_kwh": 0.475, "meat_meal": 3.3, "veg_meal": 0.7,
    "water_l": 0.000344, "shopping_usd": 0.5, "waste_kg": 0.5,
}

LEVELS = [
    (0, "Eco Beginner"), (200, "Green Explorer"), (600, "Climate Hero"),
    (1500, "Planet Protector"), (3500, "Earth Guardian"),
]

def compute_level(points: int) -> str:
    lvl = "Eco Beginner"
    for threshold, name in LEVELS:
        if points >= threshold:
            lvl = name
    return lvl

def calc_emissions(e: CarbonEntry) -> Dict[str, float]:
    transport = (e.transport_km_car * EF["car_km"] + e.transport_km_bus * EF["bus_km"]
                 + e.transport_km_train * EF["train_km"] + e.transport_km_flight * EF["flight_km"])
    electricity = e.electricity_kwh * EF["electricity_kwh"]
    food = e.food_meat_meals * EF["meat_meal"] + e.food_veg_meals * EF["veg_meal"]
    water = e.water_liters * EF["water_l"]
    shopping = e.shopping_usd * EF["shopping_usd"]
    waste = e.waste_kg * EF["waste_kg"]
    total = transport + electricity + food + water + shopping + waste
    return {"transport": round(transport,2), "electricity": round(electricity,2),
            "food": round(food,2), "water": round(water,2), "shopping": round(shopping,2),
            "waste": round(waste,2), "total": round(total,2)}

def carbon_score(daily_total: float) -> int:
    # Avg person ~16kg CO2/day. 0kg=100, 32kg=0
    score = max(0, min(100, int(100 - (daily_total / 32) * 100)))
    return score

# ========= AUTH HELPERS =========
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def make_jwt(user_id: str) -> str:
    return jwt.encode({"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
                      JWT_SECRET, algorithm="HS256")

async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Try JWT first
    user_id = None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
    except Exception:
        # Try session token
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if sess:
            exp = sess.get("expires_at")
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < datetime.now(timezone.utc):
                raise HTTPException(status_code=401, detail="Session expired")
            user_id = sess["user_id"]

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)

# ========= AUTH ENDPOINTS =========
@api.post("/auth/register")
async def register(req: RegisterReq, response: Response):
    existing = await db.users.find_one({"email": req.email}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id, "email": req.email, "name": req.name,
        "password_hash": hash_pw(req.password), "auth_provider": "email",
        "role": "user", "points": 0, "level": "Eco Beginner", "streak": 0,
        "badges": [], "trees_planted": 0, "green_twin": 10,
        "picture": None, "last_active": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = make_jwt(user_id)
    response.set_cookie("session_token", token, httponly=True, secure=True,
                        samesite="none", path="/", max_age=7*24*3600)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return {"token": token, "user": user_doc}

@api.post("/auth/login")
async def login(req: LoginReq, response: Response):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user or not user.get("password_hash") or not verify_pw(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_jwt(user["user_id"])
    response.set_cookie("session_token", token, httponly=True, secure=True,
                        samesite="none", path="/", max_age=7*24*3600)
    user.pop("password_hash", None)
    return {"token": token, "user": user}

@api.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(400, "session_id required")
    async with httpx.AsyncClient(timeout=15) as cli:
        r = await cli.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                          headers={"X-Session-ID": session_id})
        if r.status_code != 200:
            raise HTTPException(401, "OAuth session invalid")
        data = r.json()
    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id},
            {"$set": {"picture": data.get("picture"), "name": data.get("name", existing["name"])}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": data["name"],
            "picture": data.get("picture"), "auth_provider": "google",
            "role": "user", "points": 0, "level": "Eco Beginner", "streak": 0,
            "badges": [], "trees_planted": 0, "green_twin": 10,
            "last_active": None, "created_at": datetime.now(timezone.utc).isoformat(),
        })
    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie("session_token", session_token, httponly=True, secure=True,
                        samesite="none", path="/", max_age=7*24*3600)
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    user_doc.pop("password_hash", None)
    return {"user": user_doc}

@api.get("/auth/me")
async def me(user: User = Depends(get_current_user)):
    return user.model_dump()

@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ========= CARBON =========
@api.post("/carbon/entry")
async def add_carbon_entry(entry: CarbonEntry, user: User = Depends(get_current_user)):
    emissions = calc_emissions(entry)
    doc = {
        "entry_id": str(uuid.uuid4()), "user_id": user.user_id,
        "data": entry.model_dump(), "emissions": emissions,
        "date": datetime.now(timezone.utc).date().isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.carbon_entries.insert_one(doc)
    # Award points (lower emissions = more points)
    earned = max(5, int(50 - emissions["total"]))
    new_points = user.points + earned
    new_level = compute_level(new_points)
    new_twin = min(100, user.green_twin + (3 if emissions["total"] < 10 else 1))
    update = {"points": new_points, "level": new_level, "green_twin": new_twin,
              "last_active": datetime.now(timezone.utc).isoformat()}
    await db.users.update_one({"user_id": user.user_id}, {"$set": update})
    doc.pop("_id", None)
    return {"entry": doc, "points_earned": earned, "new_level": new_level}

@api.get("/carbon/entries")
async def list_entries(user: User = Depends(get_current_user), limit: int = 30):
    entries = await db.carbon_entries.find({"user_id": user.user_id}, {"_id": 0}) \
        .sort("created_at", -1).to_list(limit)
    return entries

@api.get("/carbon/summary")
async def carbon_summary(user: User = Depends(get_current_user)):
    entries = await db.carbon_entries.find({"user_id": user.user_id}, {"_id": 0}).to_list(365)
    today = datetime.now(timezone.utc).date().isoformat()
    week_start = (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat()
    month_start = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
    daily, weekly, monthly = 0.0, 0.0, 0.0
    cats = {"transport":0,"electricity":0,"food":0,"water":0,"shopping":0,"waste":0}
    trends = {}
    for e in entries:
        t = e["emissions"]["total"]; d = e["date"]
        if d == today: daily += t
        if d >= week_start: weekly += t
        if d >= month_start: monthly += t
        for k in cats: cats[k] += e["emissions"].get(k, 0)
        trends[d] = trends.get(d, 0) + t
    trend_list = sorted([{"date": k, "co2": round(v,2)} for k,v in trends.items()], key=lambda x: x["date"])[-14:]
    score = carbon_score(daily if daily>0 else (weekly/7 if weekly>0 else 16))
    return {
        "daily": round(daily,2), "weekly": round(weekly,2), "monthly": round(monthly,2),
        "categories": {k: round(v,2) for k,v in cats.items()},
        "trend": trend_list, "score": score, "trees_to_offset": int((monthly or 1) / 21),
        "total_entries": len(entries),
    }

@api.get("/carbon/predict")
async def predict(user: User = Depends(get_current_user)):
    entries = await db.carbon_entries.find({"user_id": user.user_id}, {"_id": 0}).to_list(365)
    if len(entries) < 2:
        return {"predicted_monthly": 480.0, "confidence": "low", "trend": "stable"}
    totals = [e["emissions"]["total"] for e in entries[-30:]]
    avg = sum(totals)/len(totals)
    half = len(totals)//2
    first_avg = sum(totals[:half])/max(half,1)
    second_avg = sum(totals[half:])/max(len(totals)-half,1)
    trend = "decreasing" if second_avg < first_avg*0.95 else ("increasing" if second_avg > first_avg*1.05 else "stable")
    return {"predicted_monthly": round(avg*30,2), "daily_avg": round(avg,2),
            "confidence": "high" if len(totals)>10 else "medium", "trend": trend}

# ========= AI COACH =========
async def get_user_context(user: User) -> str:
    summary = await db.carbon_entries.find({"user_id": user.user_id}, {"_id": 0}).to_list(30)
    if not summary:
        return f"User {user.name} has no carbon entries yet. They are at level {user.level} with {user.points} points."
    totals = [e["emissions"]["total"] for e in summary]
    avg = sum(totals)/len(totals)
    last = summary[-1]["emissions"] if summary else {}
    return (f"User: {user.name}, Level: {user.level}, Points: {user.points}, Streak: {user.streak} days. "
            f"Avg daily CO2: {avg:.1f}kg. Last entry breakdown: {last}. "
            f"Trees planted: {user.trees_planted}.")

@api.post("/coach/chat")
async def coach_chat(req: ChatReq, user: User = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    ctx = await get_user_context(user)
    session_id = req.session_id or f"coach_{user.user_id}"

    sys_msg = (f"You are EcoTrack AI's friendly Sustainability Coach. {ctx} "
               "Give warm, specific, actionable advice (max 5 short bullet points or 3 short paragraphs). "
               "Reference the user's actual data. Be encouraging. Use plain text, no markdown asterisks.")

    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=sys_msg) \
        .with_model("anthropic", "claude-sonnet-4-5-20250929")

    await db.chat_messages.insert_one({
        "user_id": user.user_id, "session_id": session_id, "role": "user",
        "content": req.message, "created_at": datetime.now(timezone.utc).isoformat()})

    async def event_gen():
        full = ""
        try:
            async for ev in chat.stream_message(UserMessage(text=req.message)):
                if isinstance(ev, TextDelta):
                    full += ev.content
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logger.error(f"LLM error: {e}")
            yield f"data: {json.dumps({'delta': '[Error] '+str(e)[:100]})}\n\n"
        await db.chat_messages.insert_one({
            "user_id": user.user_id, "session_id": session_id, "role": "assistant",
            "content": full, "created_at": datetime.now(timezone.utc).isoformat()})
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@api.get("/coach/history")
async def coach_history(user: User = Depends(get_current_user), session_id: Optional[str] = None):
    q = {"user_id": user.user_id}
    if session_id: q["session_id"] = session_id
    msgs = await db.chat_messages.find(q, {"_id": 0}).sort("created_at", 1).to_list(200)
    return msgs

@api.get("/coach/tip")
async def daily_tip():
    tips = [
        "Replace one car trip per week with biking — save ~5kg CO₂ weekly.",
        "Unplug chargers when not in use — phantom load is ~10% of home electricity.",
        "Eat one plant-based meal per day — cuts ~750kg CO₂/year.",
        "Wash clothes in cold water — saves ~250kg CO₂/year.",
        "Switch to LED bulbs — 80% less energy than incandescent.",
        "Carry a reusable bottle — saves 156 plastic bottles/year.",
        "Air-dry clothes when possible — dryers use enormous energy.",
    ]
    import random
    return {"tip": random.choice(tips), "date": datetime.now(timezone.utc).date().isoformat()}

# ========= CHALLENGES =========
@api.get("/challenges")
async def list_challenges(user: User = Depends(get_current_user)):
    challenges = await db.challenges.find({}, {"_id": 0}).to_list(100)
    user_progress = await db.user_challenges.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    prog_map = {p["challenge_id"]: p for p in user_progress}
    for c in challenges:
        p = prog_map.get(c["challenge_id"])
        c["joined"] = bool(p); c["progress"] = p["progress"] if p else 0
        c["completed"] = p["completed"] if p else False
    return challenges

@api.post("/challenges/join")
async def join_challenge(req: ChallengeJoin, user: User = Depends(get_current_user)):
    exists = await db.user_challenges.find_one({"user_id": user.user_id, "challenge_id": req.challenge_id}, {"_id": 0})
    if exists:
        return {"ok": True, "already": True}
    await db.user_challenges.insert_one({
        "user_id": user.user_id, "challenge_id": req.challenge_id,
        "progress": 0, "completed": False,
        "joined_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}

@api.post("/challenges/progress")
async def progress_challenge(req: ChallengeProgress, user: User = Depends(get_current_user)):
    challenge = await db.challenges.find_one({"challenge_id": req.challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    uc = await db.user_challenges.find_one({"user_id": user.user_id, "challenge_id": req.challenge_id}, {"_id": 0})
    if not uc:
        raise HTTPException(400, "Join challenge first")
    new_prog = min(challenge["target"], uc["progress"] + req.increment)
    completed = new_prog >= challenge["target"]
    await db.user_challenges.update_one(
        {"user_id": user.user_id, "challenge_id": req.challenge_id},
        {"$set": {"progress": new_prog, "completed": completed}})
    earned = 0
    if completed and not uc["completed"]:
        earned = challenge["reward_points"]
        badge = challenge.get("badge")
        badges = user.badges + ([badge] if badge and badge not in user.badges else [])
        new_points = user.points + earned
        await db.users.update_one({"user_id": user.user_id},
            {"$set": {"points": new_points, "level": compute_level(new_points),
                      "badges": badges, "trees_planted": user.trees_planted + (1 if "tree" in challenge["challenge_id"] else 0)}})
    return {"ok": True, "progress": new_prog, "completed": completed, "points_earned": earned}

# ========= COMMUNITY =========
@api.get("/community/leaderboard")
async def leaderboard():
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("points", -1).limit(20).to_list(20)
    return [{"name": u["name"], "points": u["points"], "level": u["level"],
             "picture": u.get("picture"), "badges": len(u.get("badges", [])),
             "trees": u.get("trees_planted", 0)} for u in users]

# ========= CLIMATE HUB =========
@api.get("/climate/facts")
async def climate_facts():
    facts = await db.climate_facts.find({}, {"_id": 0}).to_list(50)
    return facts

@api.get("/climate/articles")
async def climate_articles():
    arts = await db.climate_articles.find({}, {"_id": 0}).to_list(50)
    return arts

@api.get("/climate/quizzes")
async def quizzes():
    qs = await db.quizzes.find({}, {"_id": 0}).to_list(50)
    # hide correct answers
    for q in qs:
        for question in q["questions"]:
            question.pop("correct", None)
    return qs

@api.post("/climate/quiz/submit")
async def submit_quiz(req: QuizSubmit, user: User = Depends(get_current_user)):
    q = await db.quizzes.find_one({"quiz_id": req.quiz_id}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Quiz not found")
    correct = sum(1 for i, ans in enumerate(req.answers)
                  if i < len(q["questions"]) and ans == q["questions"][i]["correct"])
    total = len(q["questions"])
    earned = correct * 10
    new_points = user.points + earned
    await db.users.update_one({"user_id": user.user_id},
        {"$set": {"points": new_points, "level": compute_level(new_points)}})
    return {"score": correct, "total": total, "points_earned": earned}

@api.get("/climate/global-stats")
async def global_stats():
    return {
        "global_co2_ppm": 422.7, "temp_rise_c": 1.2,
        "arctic_ice_loss_pct_decade": 13, "sea_level_rise_mm_year": 3.4,
        "forest_loss_hectares_2024": 11000000,
        "facts": ["Atmospheric CO₂ is at the highest level in 3 million years.",
                  "The last decade was the hottest on record.",
                  "1 mature tree absorbs ~21kg CO₂ per year."],
    }

# ========= SIMULATOR =========
@api.post("/simulator/what-if")
async def what_if(payload: Dict[str, Any]):
    action = payload.get("action", "")
    daily_savings_kg = payload.get("daily_savings_kg", 1.0)
    people = payload.get("people", 1000000)
    annual = daily_savings_kg * 365 * people
    return {"action": action, "people": people,
            "annual_co2_saved_kg": round(annual,2),
            "trees_equivalent": int(annual / 21),
            "cars_off_road_equivalent": int(annual / 4600)}

# ========= REPORTS =========
@api.get("/reports/export")
async def export_csv(user: User = Depends(get_current_user)):
    entries = await db.carbon_entries.find({"user_id": user.user_id}, {"_id": 0}) \
        .sort("created_at", -1).to_list(1000)
    lines = ["date,total,transport,electricity,food,water,shopping,waste"]
    for e in entries:
        em = e["emissions"]
        lines.append(f"{e['date']},{em['total']},{em['transport']},{em['electricity']},{em['food']},{em['water']},{em['shopping']},{em['waste']}")
    csv = "\n".join(lines)
    return Response(content=csv, media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=ecotrack_report.csv"})

# ========= SEED =========
async def seed():
    if await db.challenges.count_documents({}) == 0:
        await db.challenges.insert_many([
            {"challenge_id":"no-plastic-week","title":"No Plastic Week","description":"Avoid single-use plastics for 7 days.",
             "target":7,"unit":"days","reward_points":150,"badge":"Plastic-Free","category":"waste","icon":"recycle"},
            {"challenge_id":"public-transport-30","title":"Public Transport 30","description":"Use public transit 30 times this month.",
             "target":30,"unit":"trips","reward_points":200,"badge":"Transit Hero","category":"transport","icon":"bus"},
            {"challenge_id":"save-electricity","title":"Save Electricity Challenge","description":"Reduce electricity by 20% for 14 days.",
             "target":14,"unit":"days","reward_points":180,"badge":"Watt Saver","category":"energy","icon":"zap"},
            {"challenge_id":"plant-a-tree","title":"Plant a Tree","description":"Plant or sponsor 3 trees.",
             "target":3,"unit":"trees","reward_points":300,"badge":"Tree Hugger","category":"offset","icon":"trees"},
            {"challenge_id":"meatless-monday","title":"Meatless Mondays","description":"Skip meat every Monday for 8 weeks.",
             "target":8,"unit":"mondays","reward_points":120,"badge":"Plant Pioneer","category":"food","icon":"salad"},
            {"challenge_id":"bike-to-work","title":"Bike to Work","description":"Bike to work 20 times.",
             "target":20,"unit":"rides","reward_points":160,"badge":"Pedal Power","category":"transport","icon":"bike"},
        ])
    if await db.climate_facts.count_documents({}) == 0:
        await db.climate_facts.insert_many([
            {"fact_id":"f1","title":"CO₂ at record highs","text":"Atmospheric CO₂ surpassed 420 ppm — the highest in 3 million years."},
            {"fact_id":"f2","title":"The last decade was hottest","text":"2014-2024 are the ten warmest years on record."},
            {"fact_id":"f3","title":"Trees as carbon sinks","text":"A single mature tree absorbs ~21 kg of CO₂ each year."},
            {"fact_id":"f4","title":"Oceans absorb 30%","text":"Oceans absorb ~30% of human-emitted CO₂, becoming more acidic."},
            {"fact_id":"f5","title":"Food = 26% emissions","text":"Food production is responsible for 26% of global greenhouse gases."},
        ])
    if await db.climate_articles.count_documents({}) == 0:
        await db.climate_articles.insert_many([
            {"article_id":"a1","title":"The Power of Personal Action","excerpt":"Why your choices matter in the climate equation.",
             "content":"Individual actions, multiplied across billions, are how we shift the climate trajectory. From your morning commute to dinner choices, every decision carries a carbon weight. Tracking, learning, and gradually adjusting is the most sustainable path to reduction.",
             "category":"Lifestyle","read_min":4,"image":"https://images.unsplash.com/photo-1488330890490-c291ecf62571?w=800"},
            {"article_id":"a2","title":"Decoding Carbon Footprints","excerpt":"What's actually in your carbon number.",
             "content":"Your carbon footprint is the sum of greenhouse gas emissions caused — directly and indirectly — by your activities. Transport, diet, electricity, and goods consumption are the four largest contributors for most individuals.",
             "category":"Education","read_min":6,"image":"https://images.unsplash.com/photo-1535025075092-5a1cf795130b?w=800"},
            {"article_id":"a3","title":"Trees, Forests, and the 21kg Truth","excerpt":"How nature offsets — and where it falls short.",
             "content":"A single mature tree absorbs about 21 kg of CO₂ a year. Average human emissions are 4 metric tons annually — that's ~190 trees per person. Reforestation is necessary but insufficient. Reduction at source is the real lever.",
             "category":"Nature","read_min":5,"image":"https://images.pexels.com/photos/5029853/pexels-photo-5029853.jpeg?w=800"},
        ])
    if await db.quizzes.count_documents({}) == 0:
        await db.quizzes.insert_one({
            "quiz_id":"q1","title":"Climate IQ — Basics","description":"5 questions on climate fundamentals.",
            "questions":[
                {"q":"Current atmospheric CO₂ is around?","options":["280 ppm","350 ppm","420 ppm","500 ppm"],"correct":2},
                {"q":"How much CO₂ does a mature tree absorb per year?","options":["1 kg","21 kg","100 kg","500 kg"],"correct":1},
                {"q":"Largest source of household emissions in most countries?","options":["Lighting","Transport","Heating/Cooling","Cooking"],"correct":2},
                {"q":"Which diet has lower carbon footprint?","options":["Beef-heavy","Plant-based","Fish-heavy","Dairy-heavy"],"correct":1},
                {"q":"Global average temperature has risen by approximately?","options":["0.5°C","1.2°C","2.5°C","4°C"],"correct":1},
            ]})
    # Demo user
    if not await db.users.find_one({"email": "demo@ecotrack.ai"}):
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": "demo@ecotrack.ai", "name": "Demo Eco",
            "password_hash": hash_pw("demo1234"), "auth_provider": "email",
            "role": "user", "points": 450, "level": "Green Explorer", "streak": 5,
            "badges": ["Plastic-Free"], "trees_planted": 2, "green_twin": 40,
            "picture": None, "last_active": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        # Add seed carbon entries
        for i in range(14):
            date = (datetime.now(timezone.utc) - timedelta(days=i)).date().isoformat()
            await db.carbon_entries.insert_one({
                "entry_id": str(uuid.uuid4()), "user_id": user_id,
                "data": {}, "emissions": {
                    "transport": round(3+i*0.4,2),"electricity": round(2+i*0.3,2),
                    "food": round(4+i*0.1,2),"water": 0.5,"shopping": round(2+i*0.2,2),"waste": 1.0,
                    "total": round(12.5 + i*1.2,2)},
                "date": date, "created_at": datetime.now(timezone.utc).isoformat(),
            })

@app.on_event("startup")
async def on_start():
    await seed()
    logger.info("EcoTrack AI ready")

@app.on_event("shutdown")
async def on_stop():
    client.close()

@api.get("/")
async def root():
    return {"service": "EcoTrack AI", "status": "ok"}

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get('CORS_ORIGINS','*').split(','),
                   allow_methods=["*"], allow_headers=["*"])
