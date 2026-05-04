# Reflex Royale Functionality Audit (2026-04-28)

## Objective
Restore runtime behavior to pre-migration reliability (same gameplay/auth behavior) while keeping a safe path for future UI overhaul.

## Current Symptoms Reported
- Landing and related pages render with light/white background where dark game-style contrast is expected.
- `/play` can render as a blank/white screen instead of the local game lobby.

## Audit Findings (Core Issues)

### 1) Global CSS collision between `game.css` and `style.css` (High)
- `src/app/layout.tsx` injects **both** `/game.css` and `/style.css` globally for all pages.
- `public/style.css` defines `body { background: #f4f4f4; color: #222; }`.
- `public/game.css` defines `body { background: #000; color: ... }`.
- Because both target `body`, cascade order causes visual conflicts and unreadable contrast.

Impact:
- Landing/dashboard/play visual baseline no longer matches stable pre-migration behavior.

### 2) Route-level script assumptions broken by Next layout shift (High)
- Legacy logic in `public/script.js` checks `document.body?.dataset.page === "dashboard"`.
- Next dashboard page sets `data-page="dashboard"` on `<main>`, not `<body>` (`src/app/dashboard/page.tsx`).

Impact:
- Dashboard identity subtitle and logout/login wiring can silently fail.
- Appears as "routing/UI broken" because page loads but behavior is missing.

### 3) Local game boot script loading path is fragile under Next (`/play`) (High)
- `/play` relies on `public/js/local.js`, which is an ES module importing `GameEngine.js` + `UIRenderer.js`.
- It is injected through `next/script` with `type="module"`.
- Any mismatch in script attribute behavior/load order causes the module not to execute, leaving `#game-root` empty (white/blank page symptom).

Impact:
- Local gameplay appears broken even though backend and engine files exist.

### 4) Runtime and test-mode route behavior diverged (Medium)
- Production/dev startup defaults to `useNextFrontend=true` (`NEXT_FRONTEND !== "false"`).
- Existing tests instantiate `createApp({ useSessionStore:false })` without `useNextFrontend`, so test coverage mostly exercises legacy `views/*.html` paths.

Impact:
- Tests pass while real runtime can fail on Next-rendered pages.

### 5) Partial migration leaves overlapping stacks active (Medium)
- Repo currently contains both legacy views + Vite artifacts + new Next app.
- `.next/` and other migration artifacts are present in working tree and not ignored.

Impact:
- High confusion and harder debugging; regressions are easier to introduce.

## Root-Cause Summary
The main failures are not in game logic/auth/socket authority. They come from:
- mixed frontend stacks running simultaneously,
- global stylesheet collisions,
- DOM contract drift (body attributes),
- brittle script bootstrapping for legacy module scripts in Next pages,
- tests not validating the active runtime mode.

## Restore-First Recovery Plan (No UI overhaul yet)

### Phase A — Stabilize visual + page contracts
1. Reintroduce route-scoped stylesheet behavior (do not load both global body styles everywhere).
2. Restore dashboard DOM contract expected by `script.js` (`body[data-page="dashboard"]` or equivalent script adjustment).
3. Verify `/`, `/signup`, `/login`, `/dashboard` appearance and interactions against baseline.

### Phase B — Stabilize gameplay boot paths
1. Ensure `/play` loads local module scripts with guaranteed module semantics.
2. Ensure `/play/online` script order remains deterministic (`socket.io` before `remote.js`).
3. Confirm local lobby renders and online room join/create works.

### Phase C — Align test/runtime mode
1. Add runtime-mode-aware route tests for Next-enabled mode.
2. Keep existing backend/auth/gameplay tests; extend with smoke checks for `/play` and `/play/online` rendering contracts.

### Phase D — Clean migration boundary
1. Decide one active frontend path during stabilization (legacy-first compatibility skin or Next-only baseline that mimics legacy behavior).
2. Remove/disable non-active artifacts from execution path to reduce ambiguity.
3. Update docs to declare the active runtime mode and fallback switch (`NEXT_FRONTEND`).

## Verification Checklist (Must Pass Before UI Overhaul)
- `/` renders with readable intended baseline styling.
- `/signup` and `/login` submit and redirect correctly.
- `/dashboard` shows correct guest/auth subtitle behavior and logout/login action.
- `/play` renders lobby (not blank) and accepts key/ready interactions.
- `/play/online` loads join screen, room create/join, and chat flow.
- `npm test` passes.
- Build/start path used in deployment matches tested runtime path.

## Recommended Execution Order
1. Fix stylesheet scope + dashboard body contract.
2. Fix `/play` module boot path.
3. Add runtime-mode smoke tests.
4. Re-validate all user flows.
5. Only then resume GridCN-oriented UI overhaul.
