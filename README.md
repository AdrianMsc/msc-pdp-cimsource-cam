# PDP Laboratory

Password-protected product page viewer for MSC Industrial Supply Co. Built with Express, JWT authentication, and deployable to Vercel.

## Features

- Password-only login (no username)
- JWT-based authentication with HttpOnly cookies
- Protected product detail page (`pdp-cimsource-cam.html`)
- Same look & feel as the original MSC page
- Works locally and on Vercel (serverless)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express 5 |
| Auth | JWT (`jsonwebtoken`) |
| Cookies | `cookie-parser` |
| Dev | nodemon |
| Deploy | Vercel (serverless functions in `api/`) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PASSWORD=your-secure-password
JWT_SECRET=your-random-secret
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PASSWORD` | Yes | The password required to access the product page |
| `JWT_SECRET` | No (has fallback) | Secret key used to sign JWT tokens. **Required in production.** |

### Run Locally

```bash
npm run dev     # with nodemon (auto-restart on changes)
# or
npm start       # without nodemon
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

### One-click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual Deploy

1. Push the repo to GitHub
2. Import the project in [Vercel Dashboard](https://vercel.com/new)
3. Add environment variables:
   - `PASSWORD`
   - `JWT_SECRET`
4. Deploy — Vercel auto-detects the `api/` folder and applies `vercel.json`

### How the Vercel deployment works

```
index.html (static)         → served by Vercel
api/login.js (serverless)   → handles POST /api/login
api/pdp.js (serverless)     → handles GET /pdp (via rewrite)
pdp-cimsource-cam.html      → served only through /pdp (rewrite blocks direct access)
```

## Project Structure

```
msc-pdp-cimsource-cam/
├── .env                     # Environment variables (gitignored)
├── vercel.json              # Vercel rewrites configuration
├── server.js                # Local development server
├── index.html               # Login page (password-only form)
├── pdp-cimsource-cam.html   # MSC product page (protected)
├── css/
│   └── index.css            # Login page styles
├── api/
│   ├── login.js             # Vercel serverless: login endpoint
│   └── pdp.js               # Vercel serverless: serve protected page
├── assets/                  # Static assets (images, CSS, JS from MSC)
└── package.json
```

## API Endpoints

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/` | GET | No | Login page |
| `/api/login` | POST | No | Validate password, set JWT cookie |
| `/pdp` | GET | Yes | Protected product page |
| `/api/pdp` | GET | Yes | Protected product page (used by Vercel) |
| `/logout` | GET | No | Clear JWT cookie, redirect to login |

## Auth Flow

```
Browser                  Server
  │                        │
  │  POST /api/login       │
  │  (password) ──────────>│
  │                        │  Validate password
  │                        │  Sign JWT
  │  302 + Set-Cookie: JWT │
  │  <──────────────────── │
  │                        │
  │  GET /pdp               │
  │  (cookie: JWT) ───────>│
  │                        │  Verify JWT
  │  200 (HTML page) <─────│
```

On Vercel, `/pdp` is rewritten to `/api/pdp` via `vercel.json`. Direct access to `pdp-cimsource-cam.html` is rewritten to `/` (login required).
