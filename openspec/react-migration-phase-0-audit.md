# Reflex Royale React Migration: Phase 0 Audit

## Scope
Baseline inventory of the current HTML/CSS/vanilla JS frontend, auth/session flow, and Socket.IO gameplay surfaces before React migration.

## Current Routes
- `/` -> `views/index.html`
- `/signup` -> `views/signup.html`
- `/login` -> `views/login.html`
- `/dashboard` -> `views/dashboard.html`
- `/play` -> `views/game-local.html`
- `/play/online` -> `views/game-remote.html`
- `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`

## Current UI Surfaces
- Landing page with quick links to dashboard, signup, and login
- Signup and login forms with toast-style page notifications
- Dashboard with identity-aware subtitle and account menu
- Local play screen driven by `GameEngine` + `UIRenderer`
- Online play screen driven by `remote.js` + Socket.IO
- Shared account menu mounted into `#account-menu-root`

## Auth / Session Behavior
- Session is created with `express-session` and optional `connect-mongo` store.
- Signup hashes passwords with bcrypt, creates a session, and redirects to `/dashboard`.
- Login verifies password, refreshes `lastLoginAt`, creates a session, and redirects to `/dashboard`.
- Logout destroys the session and clears `connect.sid`.
- `/api/auth/session` returns guest or authenticated user state for client-side identity rendering.
- HTML routes currently remain guest-friendly; auth is not required to view gameplay surfaces.

## Socket / Room Behavior
- Socket.IO is initialized on the same origin as Express.
- Room state is owned by the server in `sockets/gameRoom.js`.
- Current client events:
  - `createRoom`
  - `joinRoom`
  - `bindKey`
  - `requestLobbyView`
  - `setRoundCount`
  - `toggleReady`
  - `startGame`
  - `playerInput`
  - `nextRound`
  - `playAgain`
  - `removePlayer`
  - `closeRoom`
  - `leaveRoom`
  - `sendChatMessage`
  - `disconnect`
- Current server events:
  - `roomCreated`
  - `roomJoined`
  - `roomState`
  - `playerList`
  - `keyBound`
  - `countdown`
  - `waiting`
  - `react`
  - `falseStart`
  - `playerReacted`
  - `roundEnd`
  - `gameOver`
  - `chatMessage`
  - `lobbyStatus`
  - `removedFromLobby`
  - `roomClosed`
  - `error`

## Gameplay State Baseline
- Local engine states: `lobby -> countdown -> waiting -> react -> roundEnd -> gameOver`.
- Online room states: `waiting_for_players -> ready_check -> starting -> countdown -> waiting -> react -> roundEnd -> post_match -> gameOver -> closed`.
- Timing authority is server-side for online play; React must not own timing or scoring.
- False starts, missed inputs, round scoring, standings, replay, host reclaim, kick, blacklist, and chat are all server-owned.

## Regression Coverage Already Present
- `tests/serverRoutes.test.cjs`
  - Guest access to `/dashboard`, `/play`, and `/play/online`
  - `/api/auth/session` guest vs authenticated state
- `tests/integration.test.cjs`
  - Signup/login/logout flow
  - Duplicate username rejection
  - Lobby join, chat, kick, blacklist, and host reclaim
- `tests/gameEngine.test.cjs`
  - Ready toggling and duplicate key rejection
  - Start preconditions
  - Scoring, false starts, misses, and game over flow

## Migration Risks To Preserve
- Same-origin deployment and same Socket.IO namespace.
- Session cookie behavior across auth and gameplay pages.
- Guest access to play surfaces.
- Server-authoritative state transitions and timestamps.
- Host reclaim and blacklist flows in online rooms.

## Recommended Next Step
- Phase 1: add React scaffolding on top of the existing Express app without changing auth, session, or socket authority.
