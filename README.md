<div align="center">

# 🌿 EcoTrack AI

**An intelligent carbon footprint & climate-action platform.**
Measure, predict, and shrink your environmental impact — with an AI sustainability coach in your corner.

[![CI](https://github.com/your-org/eco-guardian-37/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/eco-guardian-37/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/your-org/eco-guardian-37/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/eco-guardian-37)
[![Tests](https://img.shields.io/badge/tests-56%20passing-brightgreen)](backend/tests)
[![Python](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/react-19-61DAFB.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

[Live demo](https://eco-guardian-37.emergent.host) · [Preview](https://eco-guardian-37.preview.emergentagent.com)

</div>

---

## ✨ What it does

| Feature | Description |
|---|---|
| 📊 **Carbon Calculator** | 10-field daily logger → CO₂ across transport, electricity, food, water, shopping, waste |
| 🤖 **AI Coach** | Streaming Claude Sonnet 4.5 chat that reads your actual emissions data |
| 📷 **AI Bill Scanner** | Upload a utility bill → Claude vision extracts kWh and auto-logs the entry |
| 🏆 **Challenges** | 6 gamified missions with progress, streaks, badges, and 5 ranked levels |
| 👥 **Community** | Leaderboard, badges-earned, trees-planted ranking |
| 📚 **Climate Hub** | Articles, interactive quizzes, planetary live stats |
| 🔮 **Predictions** | Next-month emissions forecast from your historical trend |
| 🌳 **Green Twin** | Evolving avatar that grows greener as you reduce |
| 📈 **Reports** | CSV export, printable report, "What-If" collective simulator |

## 🏗 Tech stack

- **Frontend** — React 19 + Tailwind + shadcn/ui + Recharts + Framer Motion
- **Backend** — FastAPI (Python 3.11) with async Motor (MongoDB)
- **Database** — MongoDB
- **AI** — Claude Sonnet 4.5 via the Emergent Universal LLM Key
- **Auth** — JWT (email/password) + Emergent-managed Google OAuth

## 🚀 Local development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend (separate terminal)
cd frontend
yarn install
yarn start
```

## 🧪 Testing

Two layers, **56 tests** total:

```bash
# Unit tests (in-process — measured by coverage)
pytest backend/tests/test_units.py --cov

# Integration tests (against live backend)
BACKEND_URL=http://localhost:8001 pytest backend/tests/test_api.py
```

| Suite | Count | Purpose |
|---|---|---|
| `test_units.py` | 24 | Pure functions: emissions math, level thresholds, password hashing, score clamping |
| `test_api.py` | 32 | Full HTTP round-trips against ingress: auth edge cases, gamification, quizzes, scanner |

Continuous Integration runs both suites on every push (see `.github/workflows/ci.yml`).

## 📂 Project structure

```
app/
├── backend/
│   ├── server.py            # All API endpoints
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── tests/
│       ├── test_units.py
│       └── test_api.py
├── frontend/
│   └── src/
│       ├── pages/           # Landing, Dashboard, Calculator, Coach, Scanner, …
│       ├── context/         # AuthContext
│       └── lib/             # api client
├── .github/workflows/ci.yml
├── .coveragerc
└── pytest.ini
```

## 🔐 Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `MONGO_URL` | backend/.env | MongoDB connection string |
| `DB_NAME` | backend/.env | Database name |
| `JWT_SECRET` | backend/.env | Signing key for email/password JWTs |
| `EMERGENT_LLM_KEY` | backend/.env | Universal key for Claude Sonnet 4.5 |
| `CORS_ORIGINS` | backend/.env | Allowed origins |
| `REACT_APP_BACKEND_URL` | frontend/.env | Public backend URL the SPA calls |

## 🌍 Accessibility

Built to WCAG 2.1 AA:
- Semantic landmarks (`<main>`, `<nav aria-label>`, `<section aria-labelledby>`)
- Decorative imagery marked `aria-hidden`, informative imagery has descriptive `alt`
- Icon-only buttons carry `aria-label`
- Form inputs paired with `<Label>`
- Keyboard-navigable throughout

## 🪪 Demo credentials

```
email:    demo@ecotrack.ai
password: demo1234
```

(Seeded automatically on first backend startup with 14 days of carbon entries.)

## 📜 License

MIT
