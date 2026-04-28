# Reflex Royale - Technical Specification

> Derived from the uploaded PRD for Reflex Royale. This specification translates product intent into implementation-ready requirements for an engineering agent. Source: the PRD defines the browser-based multiplayer reaction game, its core flows, KPIs, required features, scope, risks, and constraints. fileciteturn2file0

## 1. Document Purpose

This document converts the PRD into a technical specification for implementation planning, architecture, task decomposition, and validation.

## 2. Product Summary

Reflex Royale is a browser-based reaction-time competition game for 2 to 4 players. Players bind unique keys, wait through a randomized pre-trigger delay, then react when the screen turns green. The system measures reaction times in milliseconds, ranks players each round, tracks score across rounds, and declares both round winners and match winners. The PRD also introduces account-based play, lobby creation/join, post-round chat, and a networked mode in addition to local split-screen play. fileciteturn2file0

## 3. Implementation Goal

Build a stable semester-scope web application that supports:

- Local multiplayer for 2 to 4 players on one device.
- Optional networked multiplayer lobby flow for hosted matches.
- Fast, accurate reaction timing and result calculation.
- Basic authentication and protected user records.
- Repeatable round lifecycle with scoring, replay, and analytics display.

## 4. Scope Interpretation

The PRD contains both local-only framing and networked/lobby requirements. For implementation purposes, use the following interpretation:

- **Primary release path:** local multiplayer on a shared device.
- **Extended in-scope path:** hosted/joined lobby play for remote participants, only if achievable within the semester without destabilizing core gameplay.
- **Out of scope:** global leaderboard, advanced 3D visuals, mobile app-store deployment, AI mode, single-player mode. fileciteturn2file0

## 5. System Context

### 5.1 User Types

- Guest visitor
- Registered player
- Lobby host
- Lobby participant

### 5.2 Major Subsystems

- Frontend game client
- Authentication module
- Lobby/session management module
- Real-time match state module
- Input/timing engine
- Scoring and analytics module
- Chat module
- Persistence layer

## 6. Functional Requirements

### 6.1 Authentication

#### FR-AUTH-1: User registration
The system shall allow a user to create an account with at minimum:
- username or display name
- email or login identifier
- password

#### FR-AUTH-2: Secure credential storage
The system shall never store plaintext passwords and shall store password hashes only.

#### FR-AUTH-3: Login
The system shall authenticate existing users and create an active session.

#### FR-AUTH-4: Logout
The system shall allow a user to terminate their session.

#### FR-AUTH-5: Optional stretch auth features
Email verification and password reset are stretch goals only. fileciteturn2file0

### 6.2 Lobby Management

#### FR-LOB-1: Create lobby
A user shall be able to host a lobby.

#### FR-LOB-2: Join lobby
A user shall be able to join an existing lobby using a unique lobby code or identifier.

#### FR-LOB-3: Lobby uniqueness
Lobby identifiers shall be sufficiently random to minimize collisions and accidental joins.

#### FR-LOB-4: Lobby roster
The lobby shall display current participants, ready state, and host designation.

#### FR-LOB-5: Lobby chat
Players in a lobby shall be able to exchange text messages before the match and between rounds.

#### FR-LOB-6: Host controls
The host shall be able to start a match when all players are ready, replay with the same players, or disband the lobby. fileciteturn2file0

### 6.3 Player Setup

#### FR-SETUP-1: Player count
The system shall support 2 to 4 players per match.

#### FR-SETUP-2: Key assignment
Each player shall select a unique keyboard key as their buzzer.

#### FR-SETUP-3: Key confirmation
The player shall confirm the chosen key by pressing it a second time.

#### FR-SETUP-4: Ready state
A player becomes ready only after successful key confirmation.

#### FR-SETUP-5: Unique bindings
The system shall reject duplicate keybindings within the same match instance. fileciteturn2file0

### 6.4 Game Flow

#### FR-GAME-1: Match start precondition
A match shall not start until all participating players are ready.

#### FR-GAME-2: Countdown
When all players are ready, the system shall display a 3-2-1 countdown.

#### FR-GAME-3: Randomized delay
After the countdown, the system shall wait a randomized delay before presenting the reaction trigger.

#### FR-GAME-4: Reaction trigger
The reaction trigger shall be a visible state change to green.

#### FR-GAME-5: Input capture
The system shall capture valid player keypresses after the trigger and timestamp them.

#### FR-GAME-6: Early press handling
The system shall detect presses before the trigger and mark them as false starts. The PRD identifies false starts as a known risk, so the implementation must define behavior. Recommended default: false starter loses eligibility for that round or receives the slowest rank. This is an implementation resolution, not explicit PRD text. fileciteturn2file0

#### FR-GAME-7: Round termination
A round shall end when either:
- all players have submitted a valid input, or
- a configured response timeout expires

#### FR-GAME-8: Round results
At round end, the system shall display:
- winner of the round
- each player reaction time
- updated score
- any false-start or timeout status

#### FR-GAME-9: Match win condition
Rounds shall continue until a player reaches the configured winning score or round target.

#### FR-GAME-10: Match results
At match end, the system shall display:
- overall winner
- round-by-round aggregate statistics
- option to replay or exit to menu. fileciteturn2file0

### 6.5 Scoring and Analytics

#### FR-SCORE-1: Per-round ranking
The system shall rank valid reaction results from fastest to slowest.

#### FR-SCORE-2: Score tracking
The system shall update score after each round according to the selected scoring rule.

#### FR-SCORE-3: Analytics display
The system shall display current and aggregate match data.

#### FR-SCORE-4: Persisted personal stats
Persistent personal stats are stretch goals only. fileciteturn2file0

### 6.6 Local and Network Play Modes

#### FR-MODE-1: Local shared-device mode
The system shall support local split-screen or equivalent shared-screen play for 2 to 4 players on one device.

#### FR-MODE-2: Remote hosted mode
The system should support host/join play for remote participants if feasible within the semester.

#### FR-MODE-3: Consistent rule engine
Both local and remote modes shall use the same round-state model, scoring logic, and result calculation.

### 6.7 UX and Instructional Requirements

#### FR-UX-1: How-to-play guidance
The application shall provide instructions sufficient for most users to understand gameplay without external explanation.

#### FR-UX-2: Intuitive state communication
The UI shall clearly signal:
- waiting state
- countdown state
- pre-trigger state
- triggered state
- results state
- match-complete state

#### FR-UX-3: Reset and replay
The system shall allow game reset and replay without requiring a full page refresh. fileciteturn2file0

## 7. Non-Functional Requirements

### 7.1 Performance

#### NFR-PERF-1
Visual trigger latency after the internal trigger event should be under 100 ms.

#### NFR-PERF-2
Input timestamping should achieve effective accuracy within plus or minus 10 ms of actual keypress time, subject to browser/runtime limitations.

#### NFR-PERF-3
For synchronized matches, participating players should receive the trigger within plus or minus 10 ms of one another where architecture permits. This is most achievable in local mode; remote mode may require a documented tolerance adjustment.

### 7.2 Reliability

#### NFR-REL-1
Core gameplay flows shall complete without crashes during test sessions.

#### NFR-REL-2
No major bugs should remain in the final demo path.

#### NFR-REL-3
Game state transitions shall be deterministic and recoverable from transient UI errors.

### 7.3 Compatibility

#### NFR-COMP-1
The application shall run in a modern desktop browser.

#### NFR-COMP-2
The application should behave consistently across major desktop operating systems and browsers within the class-supported stack.

### 7.4 Security

#### NFR-SEC-1
Passwords shall be hashed using a modern password hashing algorithm available in the chosen class-approved stack.

#### NFR-SEC-2
Authenticated routes and sensitive actions shall require session validation.

#### NFR-SEC-3
User-generated chat content shall be sanitized or safely rendered to prevent injection issues.

### 7.5 Accessibility and Usability

#### NFR-ACC-1
Instructions shall be understandable within 30 seconds for at least 90 percent of test users.

#### NFR-ACC-2
The trigger state shall be communicated with sufficient visual clarity.

#### NFR-ACC-3
The UI should avoid relying exclusively on subtle color differences where practical.

### 7.6 Documentation

#### NFR-DOC-1
The project shall include setup, architecture, gameplay rules, and testing documentation. fileciteturn2file0

## 8. Success Metrics and Acceptance Targets

The following metrics are directly inherited from the PRD and become acceptance targets:

- 100 percent of core gameplay features operate without crashes during testing.
- Input detection accuracy target: plus or minus 10 ms.
- Trigger and visual update latency target: under 100 ms.
- At least 90 percent of test users understand how to play within 30 seconds.
- At least 85 percent of players complete a full match during playtesting.
- No major bugs during final demo.
- Player synchronization target: plus or minus 10 ms. fileciteturn2file0

## 9. Assumed Business Rules

These rules make the PRD implementable where it is currently underspecified:

- A match has a configurable `targetScore`.
- The default round timeout is configurable.
- A player may submit at most one scored input per round.
- Duplicate keybinds are not allowed.
- If a player times out, the result is recorded as `DNF` or equivalent.
- If multiple players have identical timestamps after browser rounding, tie-breaking is deterministic and documented.
- The host is authoritative for lobby start decisions.

## 10. State Model

### 10.1 Lobby State

Possible lobby states:
- `idle`
- `waiting_for_players`
- `binding_keys`
- `ready_check`
- `starting`
- `in_match`
- `post_match`
- `closed`

### 10.2 Round State

Possible round states:
- `round_init`
- `countdown`
- `pre_trigger_wait`
- `triggered`
- `collecting_inputs`
- `round_complete`
- `match_complete`

### 10.3 Player State

Possible player states:
- `connected`
- `binding_key`
- `ready`
- `false_start`
- `submitted`
- `timed_out`
- `disconnected`

## 11. Data Model

### 11.1 User

```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "passwordHash": "string",
  "createdAt": "datetime",
  "lastLoginAt": "datetime"
}
```

### 11.2 Lobby

```json
{
  "id": "string",
  "code": "string",
  "hostUserId": "string",
  "mode": "local | remote",
  "status": "idle | waiting_for_players | binding_keys | ready_check | starting | in_match | post_match | closed",
  "targetScore": "number",
  "maxPlayers": "2 | 3 | 4",
  "createdAt": "datetime"
}
```

### 11.3 LobbyPlayer

```json
{
  "lobbyId": "string",
  "userId": "string|null",
  "displayName": "string",
  "slot": "number",
  "keyBinding": "string",
  "isReady": "boolean",
  "isHost": "boolean",
  "joinedAt": "datetime"
}
```

### 11.4 Match

```json
{
  "id": "string",
  "lobbyId": "string",
  "status": "not_started | active | complete",
  "roundNumber": "number",
  "targetScore": "number",
  "winnerPlayerId": "string|null",
  "startedAt": "datetime",
  "endedAt": "datetime|null"
}
```

### 11.5 Round

```json
{
  "id": "string",
  "matchId": "string",
  "index": "number",
  "countdownStartedAt": "datetime",
  "triggeredAt": "datetime|null",
  "timeoutAt": "datetime|null",
  "status": "round_init | countdown | pre_trigger_wait | triggered | collecting_inputs | round_complete"
}
```

### 11.6 RoundResult

```json
{
  "roundId": "string",
  "playerId": "string",
  "pressedAt": "datetime|null",
  "reactionTimeMs": "number|null",
  "rank": "number|null",
  "outcome": "valid | false_start | timeout | disconnected"
}
```

### 11.7 ChatMessage

```json
{
  "id": "string",
  "lobbyId": "string",
  "senderPlayerId": "string",
  "content": "string",
  "createdAt": "datetime"
}
```

## 12. API / Service Boundaries

These are logical interfaces; exact transport may vary.

### 12.1 Auth API

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`

### 12.2 Lobby API

- `POST /lobbies`
- `POST /lobbies/{code}/join`
- `POST /lobbies/{id}/ready`
- `POST /lobbies/{id}/bind-key`
- `POST /lobbies/{id}/start`
- `POST /lobbies/{id}/replay`
- `POST /lobbies/{id}/close`
- `GET /lobbies/{id}`

### 12.3 Match API / Realtime Events

- `match:countdown_started`
- `match:trigger_armed`
- `match:trigger_fired`
- `match:player_input`
- `match:round_completed`
- `match:score_updated`
- `match:match_completed`

### 12.4 Chat API / Events

- `POST /lobbies/{id}/messages`
- `chat:message_sent`

## 13. Timing and Fairness Rules

- Use a monotonic high-resolution timer for internal reaction timing where available.
- Record a single authoritative `triggeredAt` event per round.
- Compute `reactionTimeMs = pressedAt - triggeredAt` for valid inputs.
- Reject or specially mark any input with `pressedAt < triggeredAt`.
- In local mode, timing should occur in one authority context to minimize drift.
- In remote mode, use a single authoritative server or host clock for final score computation rather than trusting client-local times.

## 14. Error Handling Requirements

The system shall gracefully handle:

- duplicate lobby code collision during creation
- duplicate keybinding attempts
- start requested before all players are ready
- disconnected player during lobby or match
- invalid lobby join code
- stale session
- duplicate keypress from the same player in the same round
- chat send failure
- persistence failure for non-critical analytics

## 15. Testing Requirements

### 15.1 Unit Tests

Must cover:
- reaction time calculation
- rank ordering
- false start detection
- timeout handling
- score progression
- ready-state validation
- duplicate keybind rejection
- lobby code generation

### 15.2 Integration Tests

Must cover:
- registration and login flow
- lobby creation and joining
- full round lifecycle
- replay flow
- chat in lobby and post-round state
- match completion and winner display

### 15.3 Manual / Playtest Scenarios

Must cover:
- 2-player local match
- 4-player local match
- remote host/join flow if implemented
- browser compatibility checks
- false-start scenario
- player timeout scenario
- repeated replay cycles

### 15.4 Acceptance Test Mapping

A release candidate is acceptable only if it demonstrates the PRD KPIs during testing and supports the in-scope feature set without major crashes. fileciteturn2file0

## 16. Risks and Mitigations

### Risk 1: Input delay or missed registration
Mitigation:
- use high-resolution timestamps
- minimize render-dependent timing logic
- isolate input capture from cosmetic animation

### Risk 2: False starts
Mitigation:
- explicitly validate pre-trigger input
- surface penalty state clearly in UI

### Risk 3: Incorrect score display
Mitigation:
- centralize score calculation
- recompute scoreboard from canonical round results

### Risk 4: Privacy and database security
Mitigation:
- hash passwords
- validate sessions
- restrict exposed user fields

### Risk 5: Browser/platform inconsistency
Mitigation:
- define supported browsers
- test timing behavior on multiple environments
- document acceptable tolerance bounds. fileciteturn2file0

## 17. Recommended Implementation Priorities

### Phase 1: Core local game loop
- keybinding
- ready flow
- countdown
- random trigger
- reaction timing
- round results
- score tracking
- replay/reset

### Phase 2: Persistence and accounts
- registration/login
- protected sessions
- basic user records

### Phase 3: Lobby and chat
- host/join lobby
- ready roster
- lobby chat
- post-round chat

### Phase 4: Remote multiplayer
- real-time synchronization
- authoritative match state
- disconnect handling

### Phase 5: Stretch features
- sound effects
- themes
- animations
- persistent stats
- customization
- email verification/password reset

## 18. Definition of Done

The implementation is done when:

- 2 to 4 players can complete a full browser-based match.
- Players can bind keys, ready up, and start a countdown.
- A randomized trigger appears and valid reaction times are measured.
- False starts and timeouts are handled deterministically.
- Round winners and match winners are displayed correctly.
- Replay/reset works.
- Authentication works and credentials are stored securely.
- Lobby and chat work if included in the delivered release.
- The final demo path is stable and aligned with the semester scope. fileciteturn2file0

## 19. Notes for the Implementing Agent

- Prioritize correctness and fairness of the reaction-timing loop over visual polish.
- Treat local shared-device mode as the non-negotiable core deliverable.
- Treat remote hosted mode as in-scope only if it does not materially threaten delivery of the core loop.
- Where the PRD is ambiguous, prefer deterministic rules, explicit state machines, and configuration-driven parameters.
- Keep the architecture small and class-compatible.
