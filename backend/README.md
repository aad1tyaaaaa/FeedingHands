# Feeding Hands Backend

Node.js + Express + MongoDB backend for the Feeding Hands frontend.

## Setup

1. Copy `.env.example` to `.env`.
2. Update `MONGO_URI` and `JWT_SECRET`.
3. Install and run:

```bash
npm install
npm run dev
```

## API base URL

`http://localhost:5000`

## Main routes

- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/verify-otp`
- `POST /api/auth/signin`
- `GET /api/auth/me`
- `POST /api/donate` (legacy-compatible donation create)
- `GET /api/donate`
- `GET /api/donate/tracking/:trackingId`
- `PATCH /api/donate/:id/status`
- `POST /api/organizations`, `GET /api/organizations`
- `POST /api/volunteers`, `GET /api/volunteers`
- `POST /api/biogas-donations`, `GET /api/biogas-donations`
