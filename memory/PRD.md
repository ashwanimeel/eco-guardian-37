# EcoTrack AI – PRD

## Original Problem Statement
Build EcoTrack AI – An Intelligent Carbon Footprint & Climate Action Platform that helps users understand, track, predict, and reduce their carbon footprint using AI, gamification, and community engagement.

## Tech Stack (Adapted)
- Frontend: React 19 + Tailwind + shadcn/ui + Recharts + Framer Motion
- Backend: FastAPI (Python) on port 8001
- Database: MongoDB (motor)
- AI: Claude Sonnet 4.5 via Emergent Universal LLM Key
- Auth: JWT email/password + Emergent-managed Google OAuth

## User Personas
- Individual climate-conscious user tracking daily footprint
- Eco-enthusiast competing in challenges & community
- Admin (deferred to v2)

## Core Requirements (static)
14 feature areas in original spec — see problem statement.

## What's Implemented (v1 — Feb 2026)
- Editorial nature-magazine themed Landing page
- Email/Password auth (JWT, httpOnly cookie + Bearer fallback)
- Emergent Google OAuth (login + register + AuthCallback)
- Dashboard: Carbon score, daily/weekly/monthly KPIs, 14-day trend chart, category pie, Green Twin avatar, prediction widget, daily eco-tip
- Carbon Calculator: 10-field daily logger with sliders, computes emissions across 6 categories, awards points & levels up
- AI Coach: Streaming Claude Sonnet 4.5 chat with persistent history, context-aware (reads user's real data)
- Challenges: 6 seeded challenges (Join/Log progress/Complete → badges + points)
- Community Leaderboard: Top 20 users by points with badges/trees
- Climate Hub: Live planetary stats, 3 articles (modal reader), interactive quiz w/ scoring, climate facts
- Reports: CSV export + What-If simulator (collective impact)
- Profile: User info, badges, trees, green twin, level path, logout
- Seeded demo user, 14 days of carbon entries, challenges, articles, facts, quiz

## Prioritized Backlog
### P0 (next iterations)
- Admin panel (user management, content management)
- AI Bill Scanner (electricity bill OCR → emissions estimate)
- PDF report generation (replaces print)

### P1
- Voice assistant for activity logging
- Campus Mode (university competitions)
- Team challenges + friend invites
- Streak tracker w/ daily reminders

### P2
- AR Tree Planting visualization
- AI Carbon Marketplace (spend points for rewards)
- Dark mode toggle (CSS vars already in place)
- PWA install + push notifications
- Eco Emergency Score deep-dive

## Test Credentials
demo@ecotrack.ai / demo1234 (Green Explorer, 450 points, 14 days of data seeded)
