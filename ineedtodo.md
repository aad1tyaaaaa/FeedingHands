# What I need to do manually

Everything in the code is done. These are the steps only I can do (accounts, secrets, decisions, content).
Tick them off as I go. Full deployment details are in [README.md](README.md#deployment-0month).

## 1. Check it locally first
- [ ] Run `docker compose up --build`, then open http://localhost:3000
- [ ] Sign in as each demo account (password `Demo@1234`) and click through:
  - [ ] `donor1@feedinghands.dev`: donate with photos and the freshness check, then tracking, rewards, fundraising (demo mode) and settings
  - [ ] `ngo1@feedinghands.dev`: claim a donation and edit the profile with the document upload
  - [ ] `volunteer1@feedinghands.dev`: pick up and deliver a donation, and check the map
  - [ ] `biogas1@feedinghands.dev`: collect a pickup
  - [ ] `admin@feedinghands.dev`: NGO reviews, users, reports
- [ ] Try "Forgot password?" on the sign-in page. The code shows up on screen in dev mode.
- [ ] Test the camera (freshness check) on a real phone
- [ ] Tell Claude to commit, push and open a PR (everything is staged on branch `feature/complete-platform`)

## 2. Create the free accounts
- [ ] **Neon** (database): create a project at https://neon.com and copy the connection string (it ends in `sslmode=require`)
- [ ] **Brevo** (email, 300/day free): create an account at https://www.brevo.com
  - [ ] Verify a sender email address (or a domain)
  - [ ] Copy the SMTP login and SMTP key from *SMTP & API*
- [ ] **Render** (API + website): create an account at https://render.com and connect the GitHub repo

## 3. Deploy on Render
- [ ] New → Blueprint → choose this repo. It creates `feedinghands-api` and `feedinghands-web`.
- [ ] Fill in the values Render asks for:
  - [ ] `DATABASE_URL`: the Neon connection string
  - [ ] `SMTP_HOST`: `smtp-relay.brevo.com`
  - [ ] `SMTP_USER`, `SMTP_PASS`: from Brevo
  - [ ] `SMTP_FROM`: e.g. `FeedingHands <no-reply@yourdomain>`, using the sender you verified on Brevo
  - [ ] `CORS_ORIGIN`: the website URL, e.g. `https://feedinghands-web.onrender.com`
  - [ ] `NEXT_PUBLIC_API_BASE_URL`: the API URL, e.g. `https://feedinghands-api.onrender.com`
  - [ ] Razorpay keys: **leave empty** for now (payments stay off and cost nothing)
- [ ] If Render gave different URLs, fix `CORS_ORIGIN` / `NEXT_PUBLIC_API_BASE_URL` and redeploy the website
- [ ] Open `https://<api>/health`. It should say `"db":"up"`.
- [ ] Never set `SEED_DEMO_DATA` in production. The demo passwords are public.

## 3b. Website on Vercel (instead of the Render static site)
- [ ] Note: Vercel's free Hobby plan is for non-commercial use. A donation platform may need Vercel Pro. The Render static site is free either way.
- [ ] https://vercel.com → Add New → Project → import the GitHub repo
- [ ] Set **Root Directory** to `frontend` (the framework is detected from `frontend/vercel.json`)
- [ ] Add the environment variable `NEXT_PUBLIC_API_BASE_URL` = the Render API URL, e.g. `https://feedinghands-api.onrender.com` (the build fails on purpose without it)
- [ ] Optional: `NEXT_PUBLIC_CHATBASE_ID`
- [ ] Deploy, then open the site and refresh on a deep page like `/donate`. It should load, not show a 404.
- [ ] On Render → `feedinghands-api` → Environment: set `CORS_ORIGIN` to the Vercel URL, e.g. `https://feedinghands.vercel.app` (comma-separate it to keep the Render site too)
- [ ] If Vercel is the only website: delete the `feedinghands-web` service on Render
- [ ] Whenever the API URL changes, update `NEXT_PUBLIC_API_BASE_URL` on Vercel and redeploy. It's built into the bundle.

## 4. After the first deploy
- [ ] Sign up on the live site with my own email (this checks Brevo delivers the code)
- [ ] Make myself admin. In Neon's SQL editor:
  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'me@example.com';
  ```
- [ ] Sign out and back in, then check that `/admin` opens
- [ ] Optional: add a free uptime monitor (https://uptimerobot.com or https://cron-job.org) on `https://<api>/livez` every 10 minutes so the API doesn't take about a minute to wake up. Use `/livez`, **not** `/health`: `/health` wakes the database and uses up Neon's free hours.

## 5. Content I must write or check
- [ ] Replace the placeholder contact `privacy@feedinghands.org` in `frontend/src/components/Privacy.js` (it's also used by `Terms.js`) with a real inbox
- [ ] Have someone qualified read the Privacy Policy and Terms (`/privacy`, `/terms`). They're a sensible starting draft, not legal advice.
- [ ] Learner Corner articles: review and edit `frontend/src/data/learnerResources.json`

## 6. Decisions only I can make
- [ ] **Rewards**: who actually honours the reward codes (₹100 / ₹500 / ₹1,000)? Until there are partner shops, the codes promise something nobody gives. Find partners, or tell Claude to turn them into badges.
- [ ] **Online donations**: keep them off (free), or set up Razorpay (about 2% + GST per donation, no fixed fee):
  - [ ] Who should receive the money: the platform, or each NGO directly? Right now it goes to one platform account.
  - [ ] Do donors need 80G tax-exemption receipts? That needs the organization to be registered for it first.
  - [ ] If yes to Razorpay: complete business verification (takes days), copy the key ID and secret, and add a webhook to `https://<api>/api/payments/webhook` for the `payment.captured` event. Then set the 3 `RAZORPAY_*` values on Render. Test in Razorpay's **test mode** first.
- [ ] **NGO proof**: is a registration number plus one document enough before I approve an NGO in `/admin`?
- [ ] **Notification radius**: NGOs within 10 km hear about new donations. Change `NOTIFY_RADIUS_KM` on Render if needed.
- [ ] **Help bot**: leave it off, or train a free Chatbase bot on FeedingHands FAQs and set `NEXT_PUBLIC_CHATBASE_ID` on the website service

## 7. Keeping it free and running (check monthly)
- [ ] Neon dashboard: storage under 1 GB and compute under 100 hours a month (photos are shrunk and deleted 30 days after delivery, so this should stay low)
- [ ] Brevo: under 300 emails a day. If signups grow past that, emails stop until the next day.
- [ ] Render: the API uses about 730 of the 750 free hours a month. Don't add a second free web service to the same workspace.
- [ ] Back up the database now and then. Neon free has a short restore window; for a full copy run `pg_dump "<neon url>" > backup.sql`.

## Not built yet (ask Claude when wanted)
- Sentry error tracking (needs a free Sentry account and its DSN)
- Browser tests (Playwright) for the main flows
- A full accessibility audit
- Marking failed Razorpay payments as failed (only successful ones are handled)
- Donor dashboard charts count only the donations loaded on the page (first 50 plus "Load more")
