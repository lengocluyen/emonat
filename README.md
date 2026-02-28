# Emonat

Web-first prototype of the Emonat / NeuroTask idea for graph-based tasks and lightweight “memory” per task.

Demo: `https://emonat.vercel.app/`

![Emonat screenshot](screen.png)

## What’s in this repo

- `app/` — Frontend (static assets served under `/app/`)
- `server/` — Node.js API + static hosting (Express + Postgres)

## Quick start (dev)

1) Create a Postgres DB (local or hosted) and set env vars:

Option A (local via Docker):

```bash
cd server
docker compose up -d
```

- Copy `server/.env.example` to `server/.env`
- Set `DATABASE_URL` and `JWT_SECRET`

If you used Docker compose above, a good `DATABASE_URL` is:

`postgresql://emonat:emonat@localhost:15432/emonat`

2) Install + migrate + run:

```bash
cd server
npm install
npm run migrate
npm run dev
```

Open:
- http://localhost:5173/app/#/login
- http://localhost:5173/app/#/board

Flow:
- Register/login
- Create cards on the Board
- Click a card to open its graph (auto-saved per task)

## Deploy

Run the Node server behind HTTPS (recommended) and set:
- `COOKIE_SECURE=1`
- `APP_ORIGIN=https://yourdomain.com`

Then start with `npm run start`.

### Deploy on Vercel (recommended)

This repo is designed to run on Vercel with:
- Static UI at `/app/`
- API at `/api/*` (Vercel Functions)
- Postgres (recommended: Neon)

1) Create a hosted Postgres database and copy its connection string as `DATABASE_URL` (Neon typically uses `?sslmode=require`).

2) In Vercel → Project → Settings → Environment Variables (Production + Preview), set:
- `DATABASE_URL`
- `JWT_SECRET` (long random string)
- `COOKIE_SECURE=1`

3) Run the migration once against your hosted DB:
```bash
cd server
npm install
npm run migrate
```

4) Deploy and open:
- `https://YOUR_PROJECT.vercel.app/` (redirects to `/app/`)
