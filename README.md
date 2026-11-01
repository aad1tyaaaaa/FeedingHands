# FeedingHands 🍽️

A comprehensive food donation and redistribution platform that connects donors, NGOs, and volunteers to combat food insecurity while promoting sustainability through biogas integration and community engagement.

## Features

- **Role-Based Access** — Donor, Volunteer, NGO, Biogas Partner, and Admin roles with tailored dashboards
- **Food Donation System** — Create, list, and track donations with real-time status updates and unique tracking IDs
- **AR Food Freshness Detection** — TensorFlow.js-powered camera-based food quality analysis
- **Route Optimization** — OSRM-based delivery routing for efficient volunteer coordination
- **Interactive Maps** — Leaflet/Google Maps integration showing donor, NGO, and volunteer locations
- **Volunteer Management** — Registration, profile tracking, and task assignment
- **NGO Dashboard** — Centralized operations hub for managing incoming donations
- **Biogas Integration** — Track food waste diverted to renewable energy production
- **Gamification (Puniya Points)** — Reward system incentivizing consistent donations
- **Analytics & Forecasting** — Donation trend charts, event prediction, and city-level insights
- **Gift Cards & Fundraising** — Digital fundraising tools for campaigns
- **Learner Corner** — Educational content for community awareness

## Tech Stack

### Frontend
- React 18 with React Router DOM
- TailwindCSS + Bootstrap
- Chart.js / Recharts for analytics
- Leaflet + React-Leaflet for maps
- TensorFlow.js + Teachable Machine for ML inference
- Google OAuth for authentication

### Backend
- Node.js + Express.js
- MongoDB with Mongoose ODM
- JWT-based authentication with bcrypt
- RESTful API architecture

### External Services
- Google Maps API (geocoding, location services)
- Google OAuth (sign-in)
- Supabase (supplementary backend services)
- OSRM (route optimization)
- AWS SDK (storage/email)

## Project Structure

```
FeedingHands/
├── frontend/              # Next.js app (App Router, existing React SPA inside)
│   ├── app/               # Next.js layout + catch-all page that loads the SPA
│   ├── src/
│   │   ├── components/    # 40+ components (dashboards, pages, features)
│   │   ├── api/client.js  # Centralized API client with JWT management
│   │   └── index.js       # Entry point (renders components/App.js)
│   ├── public/            # Static assets, ML model files
│   └── package.json       # Frontend dependencies & scripts
├── backend/
│   ├── server.js          # Express server (port 5000)
│   ├── config/db.js       # MongoDB connection
│   ├── models/            # Mongoose schemas (User, Donation, Volunteer, Organization, BiogasDonation)
│   ├── controllers/       # Business logic
│   ├── routes/            # API endpoints
│   ├── middleware/auth.js  # JWT verification
│   └── utils/             # Token generation helpers
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)
- Google Maps API key
- Google OAuth Client ID

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
MONGO_URI=mongodb://127.0.0.1:27017/feeding_hands
JWT_SECRET=your_jwt_secret
PORT=5000
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### Installation

```bash
cd frontend && npm install --legacy-peer-deps
cd ../backend && npm install
```

### Running the App

```bash
# Start backend server
cd backend
npm run dev

# Start frontend (Next.js)
cd frontend
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` to point the frontend at a different API (default `http://localhost:5000`).

The frontend runs on `http://localhost:3000` and the backend API on `http://localhost:5000`.

### Demo Login Credentials

The current demo flow is: landing page → gateway login → persona login → persona dashboard.
These hardcoded credentials are for local development and demonstrations only.

**Gateway login**

| Username | Password |
|----------|----------|
| `demo` | `feedinghands` |

**Persona logins**

| Persona | Username | Password | Dashboard |
|---------|----------|----------|-----------|
| Donor | `donor` | `donor123` | `/dashboard` |
| Volunteer | `volunteer` | `volunteer123` | `/VolunteerDashboard` |
| Organization | `organization` | `organization123` | `/NgoDashboard` |

## API Endpoints

| Route | Description |
|-------|-------------|
| `/api/auth` | Authentication (signup, signin, OTP verification) |
| `/api/donations` | Donation CRUD and status tracking |
| `/api/volunteers` | Volunteer registration and management |
| `/api/organizations` | NGO/organization profiles |
| `/api/biogas` | Biogas donation tracking |
| `GET /health` | Server health check |

## Database Models

- **User** — Roles, auth credentials, points, impact score
- **Donation** — Food details, geolocation, status pipeline (available → requested → picked_up → in_transit → delivered)
- **Volunteer** — Profile and contact info
- **Organization** — NGO details with geolocation
- **BiogasDonation** — Waste-to-energy tracking

## License

This project is private.
