# Emonat

Web-first prototype of the Emonat / NeuroTask idea in `spectaculations.md`.

## What’s in this repo

- `app/` — Frontend (served as static assets by the server)
- `server/` — Node.js API + static hosting

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

## Deploy to GitHub

You can publish this project to your own GitHub repository with these steps:

1. **Initialize a git repository (if not already):**
   ```sh
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Name your repo (e.g. `emonat`), set visibility, and create it.
3. **Add the remote and push:**
   Replace `YOUR_GITHUB_USERNAME` and `emonat` with your info:
   ```sh
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/emonat.git
   git branch -M main
   git push -u origin main
   ```

After pushing, you can connect this repo to Railway/Render for free cloud deployment (see below for deployment instructions).
