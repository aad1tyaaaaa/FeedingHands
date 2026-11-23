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
- **Freshness check** (experimental, `/freshness` only): TensorFlow.js / Teachable Machine camera model, runs in the browser. The current model fails a real-photo test, so it shows hints only and is not part of donating. Grade a retrained model with `node scripts/eval-freshness.mjs <photos-dir>` from `frontend/`.
- **Fundraising**: Razorpay checkout with signature-verified webhook and emailed receipts (falls back to a clearly labelled demo pledge when Razorpay keys are unset).
- **Rewards**: server-issued reward codes unlock at 10 / 50 / 100 Puniya points; admins redeem them.
- **Trust and safety**: NGOs upload a registration document and must be verified by an admin before claiming food; anyone involved in a donation can report a problem; admins can suspend users.
- **Accounts**: forgot / reset password by emailed code, edit profile, change password (signs out other devices), delete account, email notification opt-out.
- **Notifications**: emails when a donation is claimed, picked up and delivered, and to verified NGOs within `NOTIFY_RADIUS_KM` of a new donation. Dashboards refresh every 30 s.
- **Food photos**: up to 3 photos per donation.

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

With `SEED_DEMO_DATA=true` (the default in `.env.example` and docker compose), the API creates three verified accounts per role plus one admin, plus sample donations at every stage. **Every demo account uses the password `Demo@1234`.**

| Role | Name | Email | Password | Lands on |
|---|---|---|---|---|
| Donor | Aarav Sharma | `donor1@feedinghands.dev` | `Demo@1234` | `/dashboard` |
| Donor | Diya Patel | `donor2@feedinghands.dev` | `Demo@1234` | `/dashboard` |
| Donor | Kabir Mehta | `donor3@feedinghands.dev` | `Demo@1234` | `/dashboard` |
| Volunteer | Rohan Iyer | `volunteer1@feedinghands.dev` | `Demo@1234` | `/volunteer` |
| Volunteer | Sneha Kulkarni | `volunteer2@feedinghands.dev` | `Demo@1234` | `/volunteer` |
| Volunteer | Arjun Nair | `volunteer3@feedinghands.dev` | `Demo@1234` | `/volunteer` |
| Organization | Meera Joshi (Annapurna Food Bank) | `ngo1@feedinghands.dev` | `Demo@1234` | `/ngo` |
| Organization | Vikram Desai (Roti Ghar Trust) | `ngo2@feedinghands.dev` | `Demo@1234` | `/ngo` |
| Organization | Ananya Rao (Seva Sahyog Foundation) | `ngo3@feedinghands.dev` | `Demo@1234` | `/ngo` |
| Biogas partner | Farhan Shaikh | `biogas1@feedinghands.dev` | `Demo@1234` | `/biogas` |
| Biogas partner | Priya Menon | `biogas2@feedinghands.dev` | `Demo@1234` | `/biogas` |
| Biogas partner | Siddharth Rane | `biogas3@feedinghands.dev` | `Demo@1234` | `/biogas` |
| Admin | Admin | `admin@feedinghands.dev` | `Demo@1234` | `/admin` |

New users go through the real flow: **Sign up → enter the email code → choose a role → workspace**.

### Tests

```bash
cd backend-go && go test ./...      # donation status + permission rules
cd frontend && npm test             # forecast maths
node scripts/smoke.mjs              # full lifecycle against a running API (dev mode, demo data seeded)
```

CI runs all three on every push and pull request.

## Deployment ($0/month)

Everything runs on free tiers. No service needs a credit card except Razorpay's business verification, and Razorpay is optional.

| Piece | Free service | Free limits that matter |
|---|---|---|
| Database | [Neon](https://neon.com) Free | 1 GB storage, 100 compute-hours/month, scales to zero when idle. Never expires |
| API | [Render](https://render.com) free web service | 750 instance-hours/month (one service 24/7 fits); sleeps after 15 min idle, ~1 min to wake |
| Frontend | Vercel (see below) or a Render free static site, Cloudflare Pages, Netlify | Plain static files in `frontend/out` |
| Email | [Brevo](https://www.brevo.com) Free | 300 emails/day over SMTP port 2525 |
| Maps | OpenStreetMap tiles, Nominatim, OSRM demo server | Free under fair-use policies (Nominatim: max 1 request/second) |
| Payments (optional) | Razorpay | No setup or yearly fee; about 2% (+GST) is deducted per donation. Leave the keys empty to keep payments off |
| Help bot (optional) | Chatbase free plan | Leave `NEXT_PUBLIC_CHATBASE_ID` empty to hide it |

Render's free Postgres is deleted after 30 days, hence Neon. Vercel's free Hobby plan is for personal, non-commercial use only; a platform that takes donations may need Vercel Pro, or use the free Render static site instead.

The code is tuned to stay inside these limits:
- the API closes idle database connections after a minute, so Neon can scale to zero
- Render's health check uses `/livez`, which never touches the database
- photos are shrunk in the browser (≤1280 px JPEG, ~150 KB)
- photos of donations finished more than 30 days ago are deleted daily

### Steps

1. **Neon**: create a project and copy its connection string (it already ends in `sslmode=require`).
2. **Brevo**: create an account, verify a sender address, then copy the SMTP login and SMTP key from *SMTP & API*.
3. **Render**: New → Blueprint → this repo. [render.yaml](render.yaml) creates `feedinghands-api` and `feedinghands-web` and asks for:
   - `DATABASE_URL`: the Neon string
   - `SMTP_HOST`: `smtp-relay.brevo.com`
   - `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: from Brevo
   - `CORS_ORIGIN`: `https://feedinghands-web.onrender.com`
   - `NEXT_PUBLIC_API_BASE_URL`: `https://feedinghands-api.onrender.com`
   - the Razorpay keys: leave empty unless you set up Razorpay

   If Render gave the services different URLs, update those two values and redeploy the static site. The API URL is built into the bundle.
4. **Admin**: sign up on the live site, then in Neon's SQL editor run `UPDATE users SET role = 'admin' WHERE email = 'you@example.com';`.
5. **Optional, no cold starts**: point a free uptime monitor (UptimeRobot, cron-job.org) at `https://<api>/livez` every 10 minutes. It keeps the API awake without waking the database.

The API refuses to start in production without email, `CORS_ORIGIN` and a strong `JWT_SECRET`. Never set `SEED_DEMO_DATA` there.

**API environment variables** (for hosting by hand with `backend-go/Dockerfile`):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Postgres URL with `sslmode=require` |
| `JWT_SECRET` | 32+ random characters, never reused from development |
| `APP_ENV` | `production` |
| `CORS_ORIGIN` | the frontend's URL |
| `TRUST_PROXY` | `true` behind a load balancer |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | your email provider |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | optional; webhook URL `https://<api>/api/payments/webhook`, event `payment.captured`. Unset = payments off |
| `NOTIFY_RADIUS_KM` | how far (km) a new donation is announced to NGOs; default 10 |

**Frontend on Vercel**: Add New → Project → import this repo, set **Root Directory** to `frontend` (Vercel then reads [frontend/vercel.json](frontend/vercel.json): Next.js preset, SPA fallback to `/index.html`, security headers). Add the environment variable `NEXT_PUBLIC_API_BASE_URL` = the API's public URL (the build fails without it) and deploy. Then add the Vercel URL to the API's `CORS_ORIGIN` (comma-separated, e.g. `https://feedinghands.vercel.app,https://feedinghands-web.onrender.com`). Preview deployments get their own URLs, which CORS refuses unless you add them too. If you use Vercel, you can delete the `feedinghands-web` service from render.yaml.

**Frontend elsewhere**: run `npm run build` in `frontend/` with `NEXT_PUBLIC_API_BASE_URL` set, publish `frontend/out`, and rewrite every path without a file to `/index.html`.

## License

This project is private.
