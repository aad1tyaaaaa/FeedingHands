# FeedingHands 🍽️

A food donation and redistribution platform. Donors post surplus food, NGOs claim it, volunteers carry it, and food that can't be eaten goes to biogas partners.

## Features

- **Real accounts**: email + password signup, 6-digit email OTP, JWT sessions. The role is chosen once, after registering.
- **Roles**: Donor, Volunteer, Organization (NGO) and Biogas Partner, each with its own workspace. Pages check the role in the browser and every API call checks it on the server.
- **Donation lifecycle**: Donor posts → NGO claims → volunteer picks up → on the way → delivered, with a timestamped timeline and a short tracking ID (e.g. `FH-7KQ2M9XA`) anyone can look up.
- **Puniya points**: donors earn 10 points when their donation is delivered; the Food Heroes leaderboard ranks them.
- **Maps & routing**: open pickups on a map sorted by distance, and driving routes from you → donor → NGO (Leaflet + OpenStreetMap + OSRM, no API keys).
- **Biogas pickups**: anyone schedules a food-waste pickup; biogas partners mark it collected.
- **Analytics & forecast**: weekly donation history and a 4-week trend forecast for NGOs.
- **Freshness check**: TensorFlow.js / Teachable Machine camera model, runs in the browser.
- **Fundraising & gift cards**: demo UI only: no payment is taken and no card details are collected (Razorpay is a later phase).

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 16 (React 18 SPA via catch-all route), React Router 7, Recharts / Chart.js, Leaflet, TensorFlow.js |
| API | Go `net/http`, pgx, goose migrations (run on startup), bcrypt, HS256 JWT, SMTP email |
| Database | PostgreSQL |
| External | OpenStreetMap tiles, Nominatim geocoding, OSRM routing, Chatbase help bot (workspace only) |

## Project Structure

```
FeedingHands/
├── frontend/                 # Next.js app
│   ├── app/                  # layout + catch-all page that loads the SPA
│   ├── src/api/              # API client (JWT), geo/routing helpers, forecast (+ test)
│   ├── src/components/       # pages, AuthContext (session + route guards), dashboards
│   └── public/               # static assets, ML model files
├── backend-go/               # Go API, see backend-go/README.md for every endpoint and rule
│   ├── cmd/server/main.go
│   ├── internal/             # auth, donation, organization, volunteer, biogas, stats, mail, seed, httpx, db
│   └── migrations/           # PostgreSQL schema (goose)
├── scripts/smoke.mjs         # end-to-end lifecycle test against a running API
├── docker-compose.yml        # Postgres + API + web for local development
└── .github/workflows/ci.yml  # gofmt, vet, Go tests, live smoke test, frontend test + build
```

## Getting Started

### Option A: Docker (one command)

```bash
docker compose up --build
```

Open http://localhost:3000. Postgres, the API (with demo personas) and the frontend all start together.

### Option B: Run locally

Prerequisites: Node.js 22+, Go (version in `backend-go/go.mod`), PostgreSQL.

```sql
-- once, in psql
CREATE USER feedinghands WITH PASSWORD 'choose-a-password';
CREATE DATABASE feedinghands OWNER feedinghands;
```

```bash
# API: migrates the database, seeds demo personas, listens on :5001
cd backend-go
cp .env.example .env          # set DATABASE_URL and JWT_SECRET (openssl rand -base64 32)
go run ./cmd/server

# Frontend, in a second terminal: http://localhost:3000
cd frontend
cp .env.example .env
npm install
npm run dev
```

Without SMTP settings, signup codes are printed in the API terminal and shown on the signup page (development only).

### Demo personas

With `SEED_DEMO_DATA=true` (the default in `.env.example` and docker compose), the API creates three verified accounts per role, plus sample donations at every stage. **Every demo account uses the password `Demo@1234`.**

| Role | Name | Email | Password | Lands on |
|---|---|---|---|---|
| Donor | Aarav Sharma | `donor1@feedinghands.dev` | `Demo@1234` | `/dashboard` |
| Donor | Diya Patel | `donor2@feedinghands.dev` | `Demo@1234` | `/dashboard` |
| Donor | Kabir Mehta | `donor3@feedinghands.dev` | `Demo@1234` | `/dashboard` |
| Volunteer | Rohan Iyer | `volunteer1@feedinghands.dev` | `Demo@1234` | `/VolunteerDashboard` |
| Volunteer | Sneha Kulkarni | `volunteer2@feedinghands.dev` | `Demo@1234` | `/VolunteerDashboard` |
| Volunteer | Arjun Nair | `volunteer3@feedinghands.dev` | `Demo@1234` | `/VolunteerDashboard` |
| Organization | Meera Joshi (Annapurna Food Bank) | `ngo1@feedinghands.dev` | `Demo@1234` | `/NgoDashboard` |
| Organization | Vikram Desai (Roti Ghar Trust) | `ngo2@feedinghands.dev` | `Demo@1234` | `/NgoDashboard` |
| Organization | Ananya Rao (Seva Sahyog Foundation) | `ngo3@feedinghands.dev` | `Demo@1234` | `/NgoDashboard` |
| Biogas partner | Farhan Shaikh | `biogas1@feedinghands.dev` | `Demo@1234` | `/BiogasDonation` |
| Biogas partner | Priya Menon | `biogas2@feedinghands.dev` | `Demo@1234` | `/BiogasDonation` |
| Biogas partner | Siddharth Rane | `biogas3@feedinghands.dev` | `Demo@1234` | `/BiogasDonation` |

New users go through the real flow: **Sign up → enter the email code → choose a role → workspace**.

### Tests

```bash
cd backend-go && go test ./...      # donation status + permission rules
cd frontend && npm test             # forecast maths
node scripts/smoke.mjs              # full lifecycle against a running API (dev mode, demo data seeded)
```

CI runs all three on every push and pull request.

## Deployment

The recommended setup is **Vercel** (frontend), **Railway or Render** (Go API) and **managed PostgreSQL**.

**Database**: create a managed Postgres (Railway, Render, Neon, Supabase…). Use its connection string with `sslmode=require`.

**Render, one click**: New → Blueprint → this repo. [render.yaml](render.yaml) creates the API and its Postgres, generates `JWT_SECRET`, and prompts for `CORS_ORIGIN` and SMTP. (Free Postgres expires after 30 days; bump `plan` for real use.)

**API (Railway / Render, by hand)**: deploy `backend-go/` using its `Dockerfile`, with these settings:

| Variable | Value |
|---|---|
| `DATABASE_URL` | managed Postgres URL |
| `JWT_SECRET` | 32+ random characters, never reused from development |
| `APP_ENV` | `production` |
| `CORS_ORIGIN` | your Vercel URL, e.g. `https://feedinghands.vercel.app` |
| `TRUST_PROXY` | `true` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | your email provider (port 587, STARTTLS) |
| `SEED_DEMO_DATA` | leave unset; production refuses to start with it |

Health check path: `/health`. The API refuses to start in production without email, CORS and a strong secret.

**Frontend (Vercel)**: import the repo, set **Root Directory** to `frontend`, and add `NEXT_PUBLIC_API_BASE_URL` (the API's public URL). Redeploy whenever that URL changes, since it's built into the bundle.

## License

This project is private.
