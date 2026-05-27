# AGENTS.md — Soccer Lineup

Mobile-first PWA for 7v7 youth soccer coaches. Manages a player roster, tracks game-day attendance, and generates a fair 8-window rotation plan with GK locking, equal playing time, and optional keep-apart constraints.

---

## Stack

| Layer | Tool |
|---|---|
| UI | React 19, Tailwind CSS v3 |
| Build | Vite 8 |
| PWA | vite-plugin-pwa |
| DB (optional) | Firebase Realtime Database |
| Tests | Vitest |

---

## Project layout

```
src/
  App.jsx                    # Root: tab shell, wires stores to views
  index.css                  # Global styles (Tailwind base + print rules)
  main.jsx                   # ReactDOM entry, PWA registration

  components/
    RosterManager.jsx         # Roster tab: add/rename/remove/flag players, team sync UI
    GameSetup.jsx             # Game tab: attendance toggle chips, Generate button
    LineupPlan.jsx            # Lineup tab: renders 4 quarter blocks, print button
    LineupWindow.jsx          # Single window card (GK/DEF/MID/FWD/BENCH rows + swap UI)
    SwapPicker.jsx            # Modal/popover for choosing swap target

  store/
    useRoster.js              # localStorage CRUD for player roster
    useGame.js                # Present-player set, plan generation, per-window swapping
    useTeam.js                # Firebase Realtime DB sync (optional)
    useLocalStorage.js        # Safe localStorage hook with SSR/private-mode guard

  lib/
    generateLineup.js         # Core lineup algorithm (pure function, fully testable)
    generateLineup.test.js    # Vitest unit tests for the algorithm
    firebase.js               # Firebase init + isFirebaseConfigured() guard
```

---

## Core domain concepts

### Windows
A game has **8 windows**: Q1-Start, Q1-Mid, Q2-Start, Q2-Mid, Q3-Start, Q3-Mid, Q4-Start, Q4-Mid.  
`windowIndex` 0–7; even = quarter-start, odd = quarter-mid.

### Slots per window (7v7)
- 1 Goalkeeper
- 2 Defenders
- 2 Midfielders
- 2 Forwards
- 0–N Bench (everyone not in a field slot)

### GK locking
The same goalkeeper plays both windows of a quarter. A new GK is chosen at each even window. When N ≥ 8, all 4 quarter GKs are distinct.

### Force-promotion
A player benched in window W is guaranteed a field slot in window W+1 (unless they are the quarter's GK).

### Fair playing time
`windowsPlayed` is tracked per player and used to sort candidates at each window, ensuring roughly equal minutes.

### Position rotation
`positionCounts` tracks how many outfield windows each player has spent at DEF, MID, and FWD (GK windows are excluded). Each window, the algorithm enumerates all 90 ways (C(6,2)×C(4,2)) to split the 6 outfield players into pairs and picks the assignment that minimises the maximum per-player position count, with total position cost as a tiebreaker. This ensures players cycle through all three positions before repeating any, with a soft cap of ~2 per position per game.

### Consecutive-play limit
`consecutivePlay` tracks how many outfield windows each player has played without a bench window. GK windows are neutral (neither increment nor reset the counter). When N ≥ 10, players at or above a streak of 2 are sorted toward the bench end during candidate selection; best-effort only when N < 10.

### Separation constraint (⚡ flag)
Players flagged `separate: true` are kept in different position pairs (DEF, MID, FWD hold 2 players each). The 90-combination enumeration runs two passes: the first finds the globally best rotation assignment; the second finds the best rotation assignment with zero separation violations. The non-violating assignment is always preferred when one exists. Only when every combination has a violation (geometrically unavoidable, e.g. k > 3 flagged players outfield) does the algorithm fall back to the global best and record the window index in `separationViolations`.

### Constraint priority order (highest → lowest)
1. GK lock per quarter
2. Force-promotion (never bench twice in a row)
3. Equal playing time (`windowsPlayed` sort)
4. Position rotation (minimise max position count)
5. Consecutive-play limit (deprioritise at-cap players when N ≥ 10)
6. Separation constraint (⚡ flag, best-effort)

### Swapping
Tapping a chip opens `SwapPicker`. Swapping the GK at a quarter-start (even) window cascades the same swap to the mid-quarter window so the GK lock is preserved.

---

## State stores

### `useRoster`
- Persists to `localStorage` key `soccer-roster` (schema version 2).
- Exports: `players`, `addPlayer`, `removePlayer`, `renamePlayer`, `toggleSeparate`, `setPlayers`, `storageAvailable`.
- `migrate()` sanitizes/deduplicates on every read — safe to run on stale data.

### `useGame`
- In-memory only (no persistence). Receives `players` from `useRoster`.
- Exports: `presentIds` (Set), `togglePresent`, `plan`, `separationViolations`, `generatePlan`, `swapPlayers`, `clearPlan`.
- `presentIds` is reconciled against the current roster on every render (removed players drop out automatically).

### `useTeam`
- Optional Firebase Realtime DB at path `teams/{teamName}`.
- Requires `VITE_FIREBASE_*` env vars (see `.env.example`). When unconfigured, the sync panel shows a "configure Firebase" notice and all team features are hidden.
- Uses a per-session UUID (`SESSION_ID`) so a client ignores its own pushed updates.
- Debounces writes by 300 ms. Offline state is detected via Firebase's error callback.
- Team name persisted to `localStorage` key `activeTeamName` so it survives refresh.

### `useLocalStorage`
- Returns `[value, setValue, storageAvailable]`. Falls back gracefully when `localStorage` is blocked (private browsing, storage full).

---

## Key rules and invariants

- **Minimum 7 present players** to generate a lineup. `generateLineup` throws if N < 7.
- **Players array is append-only** from the UI; IDs are UUIDs and never reused.
- **Plan is pure derived state** — always regenerate from scratch; never mutate `plan.windows` directly except via `swapPlayers`.
- **GK at mid-quarter (odd) window is not swappable** from the UI — the chip is disabled (lock icon shown).
- **Firebase writes are best-effort** — offline coaches still get full local functionality.
- **Print layout** is driven by CSS (`no-print`, `lineup-print-grid` classes in `index.css`). The nav and swap UI are hidden in print.
- **Position stats table** — `LineupPlan` computes DEF/MID/FWD/GK/BNC counts from `plan.windows` and renders a table to the right of the quarter blocks (sticky on desktop, stacked on mobile). Only present players (those in `plan.presentPlayerIds`) appear in the table.

---

## Development commands

```bash
npm run dev        # Vite dev server with HMR
npm run build      # Production build → dist/
npm run preview    # Serve the dist/ build locally
npm run test       # Vitest unit tests (runs once, no watch)
```

---

## Firebase setup (optional)

Copy `.env.example` to `.env.local` and fill in the Firebase project values:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Enable **Realtime Database** in the Firebase console. The app stores data under `teams/{teamName}` — no auth is used, so treat the team name as a shared secret.

---

## Testing

`src/lib/generateLineup.test.js` covers the core algorithm (not the React layer).  
Run with `npm test`. Tests pass a seeded `rng` function so results are deterministic.

When modifying `generateLineup.js`, update or add tests to cover:
- GK uniqueness across quarters
- No consecutive bench (force-promotion)
- Equal playing time distribution
- Position rotation: no player exceeds `ceil(outfieldWindows/3) + 1` in any single position
- Consecutive-play limit: no outfield streak > 3 for N ≥ 10 (best-effort for N < 10); GK windows are neutral
- Separation constraint: zero violations for k ≤ 3 flagged players; violations must occur for k = 4 with N = 7

---

## Deployment

GitHub Actions workflow at `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on push to `main`.
