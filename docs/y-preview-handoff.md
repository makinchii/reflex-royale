# y-preview Porting Handoff

This guide captures the UI + feature work currently living on `y-preview` so it can be ported incrementally into `work/cleanup-foundation` with minimal churn.

## Branch Notes

- Source branch: `y-preview` (tracks `upstream/main`)
- Target branch: `work/cleanup-foundation`
- Keep branches separate; cherry-pick by feature area, not wholesale merges.
- The target branch has starter-style Express/Mongo scaffolding, so prioritize additive changes and route-safe edits.

## Feature Inventory

### 1) Auth + Session Layer

Primary files:

- `routes/auth.js`
- `lib/sessionAuth.js`
- `models/User.js`
- `public/script.js`

What exists in `y-preview`:

- Registration (`POST /api/auth/signup`) with bcrypt hashing and duplicate username guard.
- Login (`POST /api/auth/login`) with bcrypt verification.
- Logout (`POST /api/auth/logout`) that clears server session + cookie.
- Session identity endpoint (`GET /api/auth/me`) returning current username and best score.
- Cookie-backed in-memory session map in `lib/sessionAuth.js` using `reflexRoyaleSession` token.
- `requireAuth` middleware for protected endpoints.
- `User` schema includes `bestScore` field for analytics persistence.

Porting notes:

- Preserve existing auth route mount path `/api/auth`.
- Keep cookie handling simple first (HttpOnly + SameSite=Lax), then harden (secure flag, TTL/persistence) in a later pass.
- Ensure dashboard/online pages redirect unauthenticated users to login with `next` parameter.

### 2) Lobby + Analytics Layer

Primary files:

- `routes/leaderboard.js`
- `public/script.js`

What exists in `y-preview`:

- Leaderboard read endpoint `GET /leaderboard` (top 10 users, sorted by valid best score, then username).
- Protected score update endpoint `POST /leaderboard/update-score` using `requireAuth`.
- Update logic only saves when new reaction time is better (lower) than stored best.
- Frontend leaderboard rendering on dedicated leaderboard page and dashboard-linked flow.

Porting notes:

- Port route module and mount (`app.use('/leaderboard', leaderboardRoutes)`) early; this is low-risk and self-contained.
- Keep response shapes stable (`success`, `message`, `leaderboard`, `bestScore`, `updated`) to avoid frontend breakage.

### 3) Local Gameplay Engine (2-4 Players)

Primary files:

- `public/js/GameEngine.js`
- `public/js/UIRenderer.js`
- `public/js/local.js`
- `views/game-local.html`

What exists in `y-preview`:

- State machine: `lobby -> countdown -> waiting -> react -> roundEnd -> gameOver`.
- 2 to 4 local players with unique key-binding enforcement.
- Lobby setup UI for player name + key selection + round count.
- Countdown and randomized delay before green trigger.
- False starts tracked and penalized; missed reactions represented as Infinity/null in views.
- Points per round based on rank; aggregate stats (wins, avg, best, false starts).
- Round history display + final standings table.
- Replay paths:
  - `resetToLobby()` keeps players and restarts flow.
  - `fullReset()` clears all players for fresh setup.

Porting notes:

- This is modular and good for direct copy with minimal server impact.
- Port CSS slices needed by local renderer together with HTML shell to avoid partial visual regressions.

### 4) Remote Multiplayer Room Flow

Primary files:

- `sockets/gameRoom.js`
- `public/js/remote.js`
- `views/game-remote.html`
- `server.js` (socket initialization + route mounts)

What exists in `y-preview`:

- Host creates room with generated code; players join by code.
- Room constraints: max 4 players, min 2 to start.
- Controller lock-in step per player (keyboard or tap/click label).
- Server-authoritative timing (countdown, randomized wait, react window) in Socket.IO room state.
- Round events: false start, player reacted, round end, next round, game over.
- Play-again flow controlled by host.
- Room chat with in-memory history (last 100 messages), sender + timestamp.
- Client-side auth gate in `remote.js` via `/api/auth/me` before entering online flow.

Porting notes:

- Port server room logic and client event names as a unit; mismatches will break flow immediately.
- Keep room state in memory first; persistent rooms/chat can be deferred.

### 5) Page Layouts + Shells

Primary files:

- `views/index.html`
- `views/dashboard.html`
- `views/login.html`
- `views/signup.html`
- `views/game-local.html`
- `views/game-remote.html`

What exists in `y-preview`:

- Landing page with clear mode entry points (online, quick play, analytics).
- Dashboard as post-login command center.
- Login and signup split-pane auth pages.
- Local/remote game shells that mount JavaScript app roots.

Porting notes:

- Ensure auth pages use the same stylesheet as the new visual system (`/game.css`) if visual parity is required.
- Keep URL structure stable (`/quick-play`, `/play/online`, `/leaderboard-page`, `/dashboard`).

### 6) Shared Visual System

Primary file:

- `public/game.css`

What exists in `y-preview`:

- Neon-grid themed variables, gradients, card surfaces, buttons, and shell layouts.
- Two-column responsive page scaffolds.
- Reusable table styling for leaderboard and result views.
- Game overlays (countdown, wait, GO, round results).
- Chat cards, player slots, controller chips, and mobile responsive breakpoints.

Porting notes:

- Port as a full stylesheet snapshot instead of cherry-picking classes to prevent broken composition.
- Validate on desktop + mobile after each HTML migration step.

## Incremental Port Plan (Recommended Order)

1. Auth/session foundation (`lib/sessionAuth.js`, `routes/auth.js`, `models/User.js`, server route hooks).
2. Leaderboard APIs + dashboard/leaderboard client wiring (`routes/leaderboard.js`, `public/script.js`).
3. Base visual system + shell pages (`public/game.css`, core views).
4. Local game module (`public/js/GameEngine.js`, `public/js/UIRenderer.js`, `public/js/local.js`, `views/game-local.html`).
5. Remote sockets + remote client (`sockets/gameRoom.js`, `public/js/remote.js`, `views/game-remote.html`).
6. Final QA pass for route protection, session redirects, and gameplay regressions.

## Selective Porting Checklist

- [ ] Auth endpoints return consistent JSON and set/clear cookie correctly.
- [ ] Protected scoreboard update rejects unauthenticated requests.
- [ ] Dashboard and remote room redirect to login when not authenticated.
- [ ] Local game supports 2-4 players with unique keys and replay/reset paths.
- [ ] Remote room supports create/join/start/controller/chat/next round/play again.
- [ ] Shared CSS classes referenced by migrated views/components exist.
- [ ] Leaderboard page renders and sorts expected top results.

## Known Integration Risks

- Session storage is in-memory: restarts clear sessions.
- Remote and local flows depend on exact event names and state transitions.
- Partial CSS migration can make pages render unstyled or misaligned.
- Endpoint naming drift (`/leaderboard/update-score`, `/api/auth/me`) can silently break frontend logic.
