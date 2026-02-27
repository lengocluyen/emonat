# Run on Windows (recommended)

## 1) Start Postgres (Docker)
From `e:\Ideas\emonat\server`:

- `docker compose up -d`

## 2) Run migrations
- `npm install`
- `npm run migrate`

## 3) Start the server (detached)
- `npm run start:win`

Open:
- http://localhost:5173/app/

## Stop
- `npm run stop:win`

## Logs
- `server/server.log`
- `server/server.err.log`
