# Reflex Royale

Reflex Royale is a multiplayer reaction game built with a Next.js interface, an Express/Socket.IO backend, MongoDB-backed accounts, and server-authoritative online rooms.

## Features

- Local shared-keyboard reflex rounds for 2-4 players
- Online rooms with lobby chat, host controls, reconnect prompts, and host transfer
- Account signup/login with bcrypt password hashing and MongoDB session storage
- Dashboard with leaderboard, recent-match stats, theme controls, and audio preferences
- Server-side validation for online room state and match reporting
- Regression coverage for game rules, auth routes, socket room behavior, reducers, and route layouts

## Tech Stack

- Next.js App Router and React
- Express and Socket.IO
- MongoDB Atlas with Mongoose
- Node test runner and Playwright
- Render deployment config

## Project Structure

```text
reflex-royale/
  server.js                 Express, sessions, Socket.IO, and Next bridge
  src/app/                  Next.js app routes
  src/components/           React app components and TheGridCN UI primitives
  src/lib/                  Shared frontend/server helpers and game logic
  public/                   Static CSS, images, and small committed audio SFX
  routes/                   Express API routes
  sockets/                  Online game room socket logic
  scripts/                  Audio extraction and database seeding utilities
  tests/                    Node and Playwright regression tests
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

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm test                  # Node regression tests
npm run build             # Production Next.js build
npm run test:visual       # Build and run Playwright layout checks
npm run audio:extract     # Generate local music variants, rights confirmation required
npm run audio:seed        # Seed generated audio variants into MongoDB
```

On Windows PowerShell, use this TypeScript-only validation command:

```bash
npm.cmd exec -- tsc --noEmit
```

## Audio Assets

The repository intentionally does not commit full music tracks. Large generated files under `public/audio/` are ignored, while the small UI SFX files are committed.

To generate local music variants, install `yt-dlp` and `ffmpeg`, confirm you have rights or permission to use the configured sources, then run:

```bash
CONFIRM_AUDIO_RIGHTS=true npm run audio:extract
```

Optional environment variables:

```env
TRACK_IDS=flower-fields,break-what-you-must
YT_DLP_PATH=yt-dlp
FFMPEG_PATH=ffmpeg
FORCE_AUDIO_EXTRACT=true
```

For deployment, `npm run audio:seed` stores generated audio variants in MongoDB so `/api/audio/tracks/:trackId/stream` can serve them from the database. If MongoDB audio variants are unavailable, the app falls back to catalog metadata and any local static fallback files that exist in `public/audio/`.

## Testing

Before pushing changes, run:

```bash
npm test
npm.cmd exec -- tsc --noEmit
npm run build
```

Run `npm run test:visual` when Playwright browsers are installed and route layout coverage is needed.

## Deployment

This project includes `render.yaml` for same-origin Render deployment. In production, configure:

```env
NODE_ENV=production
TRUST_PROXY=true
MONGODB_URI=your_mongodb_atlas_connection_string
SESSION_SECRET=strong_random_secret
```

Render uses:

```bash
npm run render-build
npm run render-start
```
