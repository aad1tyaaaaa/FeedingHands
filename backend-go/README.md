# FeedingHands API (Go + PostgreSQL)

## Run

```sh
cp .env.example .env   # then fill in DATABASE_URL and JWT_SECRET
go run ./cmd/server    # migrates the database, seeds demo personas if SEED_DEMO_DATA=true, listens on :5001
go test ./...
node ../scripts/smoke.mjs   # end-to-end lifecycle check against the running API
```

Migrations in `migrations/` run automatically on startup. Add a change as a new numbered file
(`00007_something.sql` with `-- +goose Up` / `-- +goose Down` sections); never edit one that has already run.

## Layout

```
cmd/server/main.go       config, production safety checks, routes, graceful shutdown
internal/httpx           JSON helpers, CORS, security headers, rate limiter, request logging
internal/db              connection pool, migrations
internal/auth            signup → email OTP → signin, role choice, JWT middleware
internal/mail            SMTP sender for OTP codes
internal/donation        donation lifecycle, who-may-do-what rules (status.go), timeline
internal/organization    NGO profiles + logo upload
internal/volunteer       volunteer profiles
internal/biogas          food-waste pickups for biogas partners
internal/stats           aggregates for dashboards and the forecast
internal/seed            demo personas (development only)
migrations/              SQL schema
```

## Auth flow

1. `POST /api/auth/signup` `{fullName, email, password, phone?}`: creates an unverified account with role `pending` and emails a 6-digit code (logged to the console when SMTP isn't configured; also returned as `otp` outside production).
2. `POST /api/auth/verify-otp` `{email, token}`: returns `{access_token, user}`. Five wrong codes burn the code; `POST /api/auth/resend-otp` issues a new one (max one per minute).
3. `PATCH /api/auth/role` `{role}`: once, from `pending` to `donor`, `volunteer`, `organization` or `biogas`. Returns a fresh token carrying the role. `admin` is granted in the database only.
4. `POST /api/auth/signin` `{email, password}` → `{access_token, user}`. Tokens are HS256 JWTs valid for 7 days, sent as `Authorization: Bearer …`.

Auth endpoints are rate-limited to 20 requests per minute per IP (`TRUST_PROXY=true` behind a load balancer).

## Endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/health` | public |
| POST | `/api/auth/signup`, `/verify-otp`, `/resend-otp`, `/signin` | public |
| GET | `/api/auth/me` | signed in |
| PATCH | `/api/auth/role` | signed in, role `pending` |
| POST | `/api/donations` | donor |
| GET | `/api/donations` (`?status=a,b`, `?assigned=me`) | signed in: donors see their own; NGOs/volunteers also see the open pool |
| GET | `/api/donations/{id}` (with `events`) | signed in: donors only their own |
| PATCH | `/api/donations/{id}/status` | see rules below |
| GET | `/api/donations/tracking/{trackingId}` | public, no contact details or names |
| GET | `/api/organizations` | public |
| GET / PUT | `/api/organizations/me` (POST is an alias of PUT) | organization |
| PUT / DELETE | `/api/organizations/me/logo` (multipart `logo`, PNG/JPEG/WebP, ≤ 2 MB) | organization |
| GET | `/api/organizations/{id}/logo` | public |
| GET | `/api/volunteers` | public: names and delivery counts only |
| GET / PUT | `/api/volunteers/me` (POST is an alias of PUT) | volunteer |
| GET | `/api/biogas-donations` | signed in: biogas partners see all, others their own |
| POST | `/api/biogas-donations` | signed in |
| PATCH | `/api/biogas-donations/{id}/status` (`collected` / `cancelled`) | partner collects; partner or scheduler cancels |
| GET | `/api/stats` | public aggregates |

## Donation rules

Status only moves forward: `available → requested → picked_up → in_transit → delivered` (steps may be skipped);
`cancelled` is allowed before pickup. Every change adds a row to `donation_events`.

| Move | Allowed for |
|---|---|
| → `requested` | an organization with a saved profile (links the donation to it) |
| → `picked_up`, `in_transit`, `delivered` | a volunteer; once one picks it up, only they can continue |
| → `cancelled` | the donor, or the organization that claimed it |
| note/label only | anyone involved in the donation |

Delivery credits the donor with the donation's points (10). Admins may do anything.

## Production checklist

`APP_ENV=production` refuses to start unless `SMTP_HOST` and `CORS_ORIGIN` are set and `SEED_DEMO_DATA` is not `true`.
It also stops returning OTPs in responses and sends HSTS. Use a managed Postgres with `sslmode=require` in `DATABASE_URL`.
