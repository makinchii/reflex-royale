# Reflex Royale React + UI Migration Master Plan

## Purpose
Provide one phased roadmap for moving Reflex Royale from the current HTML/CSS/vanilla JS UI to a React-based frontend with a Gridcn-inspired visual overhaul, while preserving the existing Render deployment and gameplay behavior.

## Constraints
- Keep Express, Socket.IO, MongoDB, and gameplay logic stable.
- Preserve guest-friendly play.
- Keep same-origin deployment on Render.
- Treat React as the presentation layer, not the authority for gameplay timing.

## Phase 0: Baseline Audit
### Outcomes
- Current routes, page surfaces, and shared UI pieces are inventoried.
- Auth/session behavior and socket events are documented.
- Gameplay state transitions are recorded as the baseline for regression checks.

## Phase 1: React Foundation
### Outcomes
- React can render on top of the existing backend.
- The app still serves from one origin.
- Socket.IO and auth behavior remain unchanged.

## Phase 2: Gridcn Design System
### Outcomes
- Shared design tokens exist for colors, spacing, borders, shadows, and states.
- Reusable primitives exist for button, card, input, badge, table, toast, dropdown, and modal/overlay.

## Phase 3: Landing + Auth
### Outcomes
- `/`, `/signup`, and `/login` render in React.
- Signup/login behavior, redirects, and feedback still work.

## Phase 4: Dashboard + Identity Shell
### Outcomes
- `/dashboard` is React-based.
- Guest vs signed-in identity displays correctly.
- Local and online play entry points are clear.

## Phase 5: Local Play UI
### Outcomes
- `/play` uses React views for lobby, countdown, waiting, trigger, results, and game over.
- Game logic stays authoritative outside React.

## Phase 6: Online Play UI
### Outcomes
- `/play/online` uses React views for join, lobby, match, and reconnect states.
- Room creation, chat, host reclaim, kick, and blacklist behavior remain intact.

## Phase 7: Shared UX Polish
### Outcomes
- Notifications and overlays are centralized.
- Responsive behavior improves for narrow screens and touch.

## Phase 8: Cleanup + Docs
### Outcomes
- Legacy DOM-rendering code is removed after each surface stabilizes.
- Root docs point to this plan and the technical spec.
- Regression checks cover auth, lobby flow, and gameplay transitions.

## Recommended Root Cleanup Targets
- `REACT_MIGRATION_PLAN.md`
- `GRIDCN_UI_MIGRATION_PLAN.md`
- `ONLINE_IMPLEMENTATION_PLAN.md`
- Update `README.md` to link to this master plan.
