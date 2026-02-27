# Emonat (Web Prototype)

This is a **web-first prototype** of the spec in `spectaculations.md`:
- Infinite canvas graph (React Flow)
- Custom nodes: **Task (square)**, **Memory (circle)**, **Milestone (diamond)**
- Edge types: **Dependency (solid arrow)** and **Reference (dotted)**
- **River Mode** layout (left-to-right) for dependency DAG
- Responsive UI (desktop side panel, mobile bottom sheet)
- Email/password login + Task Board (Planning / Doing / Done)

## Run locally

This repo includes a Node.js server that serves the web app and provides the `/api` endpoints.

### Server (recommended)

1) Install deps:

```bash
cd server
npm install
```

2) Create a Postgres database and set env vars:

Quick local DB (optional):

```bash
cd server
docker compose up -d
```

By default this maps Postgres to `localhost:15432`.

- Copy `server/.env.example` to `server/.env`
- Set `DATABASE_URL` and `JWT_SECRET`

3) Create tables:

```bash
cd server
npm run migrate
```

4) Start:

```bash
cd server
npm run dev
```

Open:

- Login: http://localhost:5173/app/#/login
- Board: http://localhost:5173/app/#/board

## How to use

- **Double-click** the canvas to create a **Task** node.
- **Drag & drop a file** onto the canvas to create a **Memory** node (small images get a preview).
- **Connect nodes** by dragging from the node handles.
- Choose edge type from the **Edge** dropdown:
  - `Reference` = dotted line
  - `Dependency` = solid arrow (blocks target until source is done)
- Toggle **Brain/River Mode** to switch layouts.
- Graph persists automatically in `localStorage`.

## Login + Board + Graph

- Register/login at `#/login`
- Board at `#/board`
- Click a task card to open its **graph** (saved per-task in the server database)

## Notes

This is Phase 1 of the roadmap (web-only prototype). The next step is migrating this into a Vite + TypeScript project and adding richer editing (rich text, attachments, and collaboration).
