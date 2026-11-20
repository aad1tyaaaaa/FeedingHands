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
internal/auth            signup → email OTP → signin, password reset/change, settings, role choice, JWT middleware
internal/admin           admin console (users, NGO verification, reports) + POST /api/reports
internal/mail            SMTP sender for OTP codes
internal/donation        donation lifecycle, who-may-do-what rules (status.go), timeline
internal/organization    NGO profiles, logo and registration-document upload
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
5. Forgot password: `POST /api/auth/forgot-password` `{email}` always answers 200 with the same message; only a verified,
   active account gets a code (same OTP columns, 10-minute expiry, one per minute; `otp` in the response outside production).
   `POST /api/auth/reset-password` `{email, token, password}` → `{access_token, user}`; five wrong codes burn it. A reset code
   can't verify a signup and a signup code can't reset a password.

Every authenticated request re-reads the user row: tokens issued before the last password change (reset or
`PATCH /api/auth/password`) get 401, a suspended account gets 403 `{message, code: "suspended"}` (signin too), a deleted
account gets 401, and the role comes from the database, so an admin's role change applies immediately.
User JSON: `{id, fullName, email, phone, role, isVerified, points, emailNotifications, created_at}`.

Auth endpoints (all of the above plus the settings ones below) are rate-limited to 20 requests per minute per IP
(`TRUST_PROXY=true` behind a load balancer).

## Endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/health` | public |
| POST | `/api/auth/signup`, `/verify-otp`, `/resend-otp`, `/signin` | public |
| POST | `/api/auth/forgot-password`, `/reset-password` | public |
| GET | `/api/auth/me` | signed in |
| PATCH | `/api/auth/me` `{fullName?, phone?, emailNotifications?}` → `{user}` (`phone: ""` clears it) | signed in |
| DELETE | `/api/auth/me` `{password}` → 204 (donations and profiles stay, unlinked) | signed in |
| PATCH | `/api/auth/password` `{currentPassword, newPassword}` → `{access_token, user}`; signs out other sessions | signed in |
| PATCH | `/api/auth/role` | signed in, role `pending` |
| POST | `/api/donations` | donor |
| GET | `/api/donations` (`?status=a,b`, `?assigned=me`) | signed in: donors see their own; NGOs/volunteers also see the open pool |
| GET | `/api/donations/{id}` (with `events`) | signed in: donors only their own |
| PATCH | `/api/donations/{id}/status` | see rules below |
| GET | `/api/donations/tracking/{trackingId}` | public, no contact details or names |
| GET | `/api/organizations` | public: verified organizations only |
| GET / PUT | `/api/organizations/me` (POST is an alias of PUT; takes `registrationNo`) | organization |
| PUT / DELETE | `/api/organizations/me/logo` (multipart `logo`, PNG/JPEG/WebP, ≤ 2 MB) | organization |
| PUT | `/api/organizations/me/document` (multipart `document`, PDF/PNG/JPEG, ≤ 5 MB) → `{organization}` | organization |
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
| → `requested` | an organization whose profile an admin has verified (links the donation to it) |
| → `picked_up`, `in_transit`, `delivered` | a volunteer; once one picks it up, only they can continue |
| → `cancelled` | the donor, or the organization that claimed it |
| note/label only | anyone involved in the donation |

Delivery credits the donor with the donation's points (10). Admins may do anything.

## Organization verification, admin and reports

Organization JSON adds `verificationStatus` (`pending` | `verified` | `rejected`), `registrationNo`, `reviewNote` and
`hasDocument`. New profiles start `pending`; an admin verifies or rejects them (the owner is emailed). Saving the profile or
uploading a document moves a `rejected` organization back to `pending`. Only verified organizations appear in the public
directory and can claim donations. Demo organizations are seeded as verified.

| Method | Path | Who |
|---|---|---|
| GET | `/api/admin/overview` → `{usersByRole, pendingOrganizations, openReports, donationsByStatus}` | admin |
| GET | `/api/admin/users?q=&role=&before=&limit=` → `{users:[…, suspended], next}` (newest first, limit ≤ 200) | admin |
| PATCH | `/api/admin/users/{id}` `{suspended?, role?}` → `{user}` (not on yourself) | admin |
| GET | `/api/admin/organizations?status=pending\|verified\|rejected` → `{organizations:[… + ownerEmail]}` | admin |
| GET | `/api/admin/organizations/{id}/document` (always a download) | admin |
| PATCH | `/api/admin/organizations/{id}/verification` `{status: verified\|rejected, note}` → `{organization}` | admin |
| GET | `/api/admin/reports?status=open\|resolved\|dismissed` → `{reports}` | admin |
| PATCH | `/api/admin/reports/{id}` `{status: resolved\|dismissed, resolution, cancelDonation?}` → `{report}` | admin |
| POST | `/api/reports` `{donationId, reason}` → 201 `{report}` | the donation's donor, claiming NGO or volunteer, or an admin |

`cancelDonation` (only with `resolved`) cancels the donation with a "Cancelled by admin" timeline entry in the same
transaction; it answers 409 and changes nothing if the donation is already delivered or cancelled.

**Create the first admin.** Admin can't be chosen in the app: sign up and verify normally, then run

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.org';
```

The change applies to the user's current token straight away. Further admins can be promoted from `/api/admin/users/{id}`.

## Production checklist

`APP_ENV=production` refuses to start unless `SMTP_HOST` and `CORS_ORIGIN` are set and `SEED_DEMO_DATA` is not `true`.
It also stops returning OTPs in responses and sends HSTS. Use a managed Postgres with `sslmode=require` in `DATABASE_URL`.

## Donations, payments and rewards

| Method | Path | Who |
|---|---|---|
| GET | `/api/donations`, `/api/biogas-donations` (`?before=<id>&limit=<n>`, default 50, max 200) | as above; responses add `next` (pass it as `before`) or `null` on the last page |
| POST | `/api/donations` also takes `freshness`, `freshnessConfidence` (0..1) | donor |
| POST | `/api/donations/{id}/photos` (multipart `photo`, PNG/JPEG/WebP, ≤ 2 MB, max 3) → `{photo:{id}}` | the donation's donor |
| GET | `/api/donations/{id}/photos/{photoId}` | anyone who may GET the donation (fetch with the Bearer header) |
| GET | `/api/payments/config` → `{enabled, keyId}` | public |
| POST | `/api/payments/order` `{amount}` (rupees, 1..500000) → `{orderId, amount (paise), currency, keyId}` | signed in |
| POST | `/api/payments/verify` `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` → `{payment}` | signed in |
| POST | `/api/payments/webhook` (`X-Razorpay-Signature`, event `payment.captured`) | Razorpay |
| GET | `/api/payments/mine` | signed in |
| GET | `/api/rewards` → `{points, rewards:[{tier, name, code, unlocked, redeemed_at}]}` | signed in |
| POST | `/api/rewards/redeem` `{code}` (409 if already redeemed) | admin |

Donation JSON carries `freshness`, `freshness_confidence` and `photos` (ids). Only organizations an admin has verified can claim
donations. `/api/stats` totals include `raisedRupees` (sum of paid payments).

**Emails** (only to users with `email_notifications` on; logged instead when SMTP isn't set; sent after commit and never fail
the request): the donor when their donation is claimed, picked up or delivered; the claiming NGO on pickup and delivery;
verified NGOs within `NOTIFY_RADIUS_KM` (default 10, at most 50 recipients) when a donation with coordinates is posted;
a receipt when a payment is first marked paid.

**Payments** use Razorpay Checkout with no SDK. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (without them, config says
`enabled:false` and orders get 503) and `RAZORPAY_WEBHOOK_SECRET` for the webhook. A payment is marked paid by a verified
checkout signature or webhook, whichever arrives first; repeats change nothing.
