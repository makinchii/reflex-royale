# Reflex Royale

Reflex Royale is a multiplayer reaction game built with a Next.js UI, an Express server, MongoDB-backed accounts, and Socket.IO-powered online rooms.

## Features

- Account signup and login with bcrypt password hashing
- MongoDB Atlas persistence through Mongoose
- Server-authoritative online rooms with chat, reconnect, and host controls
- Local shared-keyboard play through the React game runtime
- Next.js landing, dashboard, auth, navigation, play, and UI Lab screens
- Theme and intensity controls for the new neon visual system

## Project Structure

```text
reaction-game/
  server.js                 Express, sessions, Socket.IO, Next bridge
  src/app/                  Next.js app routes
  src/components/           React app and TheGridCN components
  src/lib/                  Shared auth, metadata, UI, and data helpers
  public/                   Static assets and shared game styles
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

## Tests

```bash
npm test
```

Use `npm.cmd exec -- tsc --noEmit` on Windows PowerShell when you need a TypeScript-only validation pass.

## Deployment

This project includes `render.yaml` for a same-origin Render deployment. In production, set `NODE_ENV=production`, `TRUST_PROXY=true`, `MONGODB_URI`, and a strong `SESSION_SECRET`.
