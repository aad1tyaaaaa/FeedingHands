# FeedingHands API (Go + PostgreSQL)

## Run

```sh
cp .env.example .env   # then fill in DATABASE_URL and JWT_SECRET
go run ./cmd/server    # migrates the database, then listens on :5001
go test ./...
```

Migrations in `migrations/` run automatically on startup. Add a change as a new numbered file
(`00006_something.sql` with `-- +goose Up` / `-- +goose Down` sections); never edit one that has already run.

## Layout

```
cmd/server/main.go       config, routes, graceful shutdown
internal/httpx           JSON helpers, CORS, request logging
internal/db              connection pool, migrations
internal/auth            signup → OTP → signin, JWT middleware
internal/organization    profiles + logo upload
internal/donation        donations + status timeline
internal/volunteer       volunteer sign-ups
internal/biogas          biogas waste pickups
migrations/              SQL schema
```

## Endpoints

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | |
| POST | `/api/auth/signup` | |
| POST | `/api/auth/verify-otp` | |
| POST | `/api/auth/signin` | |
| GET | `/api/auth/me` | token |
| PATCH | `/api/auth/role` | token |
| GET / POST | `/api/organizations` | optional |
| GET / PUT | `/api/organizations/me` | organization |
| PUT / DELETE | `/api/organizations/me/logo` (multipart field `logo`, PNG/JPEG/WebP, max 2 MB) | organization |
| GET | `/api/organizations/{id}/logo` | |
| GET / POST | `/api/donations` | optional |
| GET | `/api/donations/{id}` (includes `events`) | |
| PATCH | `/api/donations/{id}/status` | optional |
| GET | `/api/donations/tracking/{trackingId}` (public, no contact details) | |
| GET / POST | `/api/volunteers` | optional |
| GET / POST | `/api/biogas-donations` | optional |

"optional" means a valid token links the record to the signed-in user, and anonymous requests still work.

Donation status only moves forward: `available → requested → picked_up → in_transit → delivered`
(steps may be skipped); `cancelled` is allowed before pickup. Every change adds a row to `donation_events`.
