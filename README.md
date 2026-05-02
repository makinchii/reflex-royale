# Reflex Royale

Reflex Royale is a multiplayer reaction game built with a Next.js UI, an Express server, MongoDB-backed accounts, and Socket.IO-powered online rooms.

## Features

- Account signup and login with bcrypt password hashing
- MongoDB Atlas persistence through Mongoose
- Server-authoritative online rooms with chat, reconnect, and host controls
- Local shared-keyboard play through the current legacy game shell
- Next.js landing, dashboard, auth, and UI Lab screens for the ongoing UI overhaul
- Theme and intensity controls for the new neon visual system

## Planning Docs

- UI overhaul roadmap: `UI_OVERHAUL_ROADMAP.md`
- Canonical migration plan: `openspec/react-migration-master-plan.md`
- Technical spec: `reflex_royale_technical_spec.md`

## Project Structure

```text
reaction-game/
  server.js                 Express, sessions, Socket.IO, Next bridge
  src/app/                  Next.js app routes
  src/components/           React app and TheGridCN components
  src/lib/                  Shared auth, metadata, UI, and data helpers
  public/                   Legacy game scripts/styles still used by play routes
  views/                    Legacy fallback HTML when NEXT_FRONTEND=false
  routes/                   Express API routes
  sockets/                  Online game room socket logic
  tests/                    Node test suite
```

## Setup

```bash
npm install
```

Create a `.env` file from `.env.example` and set at least:

```env
MONGODB_URI=your_mongodb_atlas_connection_string_here
PORT=3000
SESSION_SECRET=your_session_secret_here
NODE_ENV=development
TRUST_PROXY=false
```

## Development

```bash
npm run dev
```

Open `http://localhost:3000`.

The Next frontend is enabled by default. Set `NEXT_FRONTEND=false` to use the legacy HTML fallback routes while the UI migration is still in progress.

## Tests

```bash
npm test
```

Use `npm.cmd exec -- tsc --noEmit` on Windows PowerShell when you need a TypeScript-only validation pass.

## Deployment

This project includes `render.yaml` for a same-origin Render deployment. In production, set `NODE_ENV=production`, `TRUST_PROXY=true`, `MONGODB_URI`, and a strong `SESSION_SECRET`.
