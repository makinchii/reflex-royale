# Reflex Royale Online Implementation Plan

## Goal
Ship a same-origin public online version of Reflex Royale where two devices on the same or different networks can create, join, and play in the same lobby.

Guests can play all gameplay features. Logged-in users keep account-based stats/profile data only.

## Phase 1: Relax Gameplay Authentication
### What to implement
- Remove auth gating from gameplay routes (`/play`, `/play/online`) so guests can enter the game.
- Keep auth for account-related pages and APIs.
- Update the UI to clearly distinguish guest state from logged-in state.
- Keep the existing account menu, but show a guest-friendly state when no session exists.

### Expected outcome
- A guest can load the game, join a local or online session, and play without creating an account.
- Logged-in users still see their username and account menu.

### Verifiable results
- Open `/play` and `/play/online` in a private window and confirm they load.
- Open the dashboard while logged out and confirm it redirects only for account pages, not gameplay.
- Confirm logged-in users still see their account badge.

## Phase 2: Public Deployment Foundation
### What to implement
- Deploy the app as a single same-origin service.
- Connect the production environment to MongoDB Atlas.
- Configure session cookies and Socket.IO to work over HTTPS behind a public host.
- Make the app resilient to host cold starts and reconnects.
- Keep all frontend, backend, and websocket traffic on one public origin.

### Expected outcome
- The app is reachable from any browser on any network through one public URL.
- Sessions, rooms, and sockets work from outside localhost.

### Verifiable results
- Load the public URL from a device that has never accessed the app before.
- Confirm login, room creation, and room joining all work over the public URL.
- Refresh a page and confirm the session survives.
- Confirm Socket.IO connects without origin or cookie errors.

## Phase 3: Online Lobby Stability
### What to implement
- Keep the current server-authoritative lobby model stable for public use.
- Preserve room creation, join, ready, start, replay, chat, kick, blacklist, and host reclaim.
- Ensure kicked users are prevented from rejoining the same lobby.
- Ensure reconnect/reclaim still works after refresh or temporary disconnect.
- Make lobby state transitions deterministic and visible.

### Expected outcome
- Two devices can join the same lobby and stay synchronized.
- Host and player reconnects work reliably.
- Kicked players cannot re-enter the same room.

### Verifiable results
- Create a room on one device and join it from a second device.
- Ready both players and start a match.
- Refresh the host and confirm host reclaim still works.
- Kick a player and confirm they are returned to join screen and blocked from rejoining.
- Send chat messages and confirm both clients receive them.

## Phase 4: Guest and Account Separation
### What to implement
- Treat gameplay as guest-friendly.
- Track stats only for authenticated users.
- Keep gameplay identity separate from account identity.
- Avoid forcing login in the play flow.

### Expected outcome
- Guests can play the full game without a profile.
- Logged-in users can be tracked for future stats/profile use.

### Verifiable results
- Play a full match while logged out.
- Log in on another browser and confirm the account UI changes.
- Confirm gameplay remains available whether signed in or not.
- Confirm no stats/profile data is required for lobby access.

## Phase 5: Stats and Profile Scaffolding
### What to implement
- Add or preserve backend fields needed for future profile stats.
- Track stats only when a real session/user exists.
- Add a lightweight foundation for a future profile page without blocking gameplay.

### Expected outcome
- The app can record user stats later without changing core lobby behavior.
- Guest play remains unchanged.

### Verifiable results
- Confirm the user model supports profile/stat expansion.
- Confirm logged-in sessions can be associated with gameplay stats later.
- Confirm guests still create no account-bound stats.

## Phase 6: Cross-Network Smoke Testing
### What to implement
- Run end-to-end tests using two actual devices.
- Confirm play works on the same network and on different networks.
- Validate reconnect and recovery flows under real browser conditions.

### Expected outcome
- The public online version is ready for a demo.

### Verifiable results
- Two devices can create/join the same room.
- The match can be started, played, replayed, and completed.
- Refreshing either device does not permanently break the lobby.
- Different networks can connect through the public URL.

## Phase 7: Demo Hardening and Documentation
### What to implement
- Update README and demo notes with the public URL, room flow, and known limits.
- Add a simple troubleshooting guide for reconnects and cold starts.
- Remove any leftover localhost-only assumptions.

### Expected outcome
- The project is easy to demo and explain.

### Verifiable results
- A new user can follow the docs to join or host a lobby.
- The documented demo flow matches the real app behavior.

## Success Criteria
- A guest on one device can create a room.
- A second device on the same or a different network can join that room.
- Both devices can ready up and play a full match.
- Host reclaim, chat, replay, and kick/blacklist all continue to work.
- Logged-in users remain supported for future stats/profile features.
