# Client Architecture

## Overview

The client is a React 18 + TypeScript single-page application using Vite as the build tool. It follows a **simple layered architecture** with centralised state in `App.tsx`, a typed API client, and component-based UI.

## Directory Structure

```
client/src/
├── main.tsx              # Entry point (ReactDOM.render)
├── App.tsx               # Root component (routing, global state, layout)
├── api.ts                # API client (fetch wrapper + typed endpoints)
├── types.ts              # TypeScript interfaces + utility functions
├── constants.ts          # App constants (points, score limits, etc.)
├── index.css             # Global styles
└── components/
    ├── Tabs.tsx          # Tab navigation (4 tabs, admin-only Users tab)
    ├── GroupTab.tsx      # Group stage: standings table + match prediction inputs
    ├── KnockoutTab.tsx   # Knockout bracket: vertical round-based layout
    ├── LeaderboardTab.tsx # Rankings table with points breakdown
    ├── UserTab.tsx       # Admin: user list + password reset
    └── ErrorBoundary.tsx # Class component catching render errors
```

---

## Data Flow

```
[User Interaction]
     ↓
[Component State] (useState for form inputs, saving flags)
     ↓
[API Call] → api.ts → fetch('/api/...', { Authorization: Bearer <token> })
     ↓
[Server] → Express REST API (see server/ARCHITECTURE.md)
     ↓
[Response] → typed by api.ts generics → updates component state
     ↓
[Re-render] → React reflects new data
```

---

## Key Modules

### `api.ts` — Centralised API Client

Single `request<T>()` function handles all HTTP calls:
- Adds `Cache-Control: no-cache` headers (prevents stale predictions)
- Injects JWT from `localStorage`
- Appends cache-busting query param `?_t=Date.now()` to every request
- Throws on non-OK responses (extracts error message from JSON)

Exports namespaced `api` object mirroring server routes:

```typescript
api.auth.register(username, password) → AuthResponse
api.auth.login(username, password) → AuthResponse
api.auth.me() → User

api.predictions.get() → Predictions map
api.predictions.save(matchKey, homeScore, awayScore) → { success: boolean }

api.results.get() → Results map
api.leaderboard.get() → LeaderboardEntry[]
api.groups.get() → Groups
api.knockout.get() → KnockoutRound[]
api.teamCodes.get() → TeamCodes map

api.admin.users.get() → User[]
api.admin.users.resetPassword(userId, newPassword) → { success: boolean }
```

**Note:** Email is deprecated — `User` interface does not include email, though `UserTab` still shows it for legacy accounts.

### `types.ts` — Shared Types & Utilities

** Interfaces (mirror server responses):**
- `User` — `{ id, username, isAdmin }`
- `Predictions` — `{ [matchKey]: { homeScore, awayScore } }`
- `Results` — same shape plus `isKnockout`, `roundName`
- `LeaderboardEntry` — `{ userId, username, exact, outcome, total, predictionCount }`
- `Groups` — `{ [groupLetter]: { teams: string[], matches: number[][] } }`
- `KnockoutRound` — `{ id, name, matches }` (round metadata)
- `TeamCodes` — `{ [teamName]: isoCode }` (e.g., "Mexico" → "mx")

**Utilities:**
- `parseScore(value: string): number | ""` — validates input (0–MAX_SCORE), returns empty string for invalid
- `MAX_SCORE = 20` — maximum allowed score input
- `PROHIBITED = "🚫"` — placeholder for disallowed inputs
- `MIN_PASSWORD_LENGTH = 4`
- `POINTS_EXACT = 5`, `POINTS_OUTCOME = 2` — scoring constants (must match server)

### Components

| Component | Props | State | Purpose |
|-----------|-------|-------|---------|
| `App` | — | `user`, `loading` | Routing, auth context, data orchestration |
| `Login` | `onLogin` | `username`, `password`, `error`, `isRegister` | Auth form |
| `Game` | `user`, `onLogout` | See below | Main layout + tab management |
| `Tabs` | `tab`, `setTab`, `isAdmin`, `onUsersClick` | — | Navigation bar |
| `GroupTab` | `groups`, `results`, `teamCodes`, `predictions`, `isAdmin`, `showToast` | `localPredictions`, `saving` | Editable standings table with score inputs |
| `KnockoutTab` | `results`, `predictions`, `knockout`, `isAdmin`, `showToast` | `localPredictions`, `saving` | Bracket view with score inputs |
| `LeaderboardTab` | `results`, `leaderboard` | — | Rankings + stats |
| `UserTab` | `users`, `loadingUsers`, `showToast` | `selectedUser`, `newPassword` | Admin user management |
| `ErrorBoundary` | `children` | `hasError` | Catches render errors, shows reload button |

**`Game` component state (lifted to App in original, now in Game):**
```typescript
{
  tab: "groups" | "knockout" | "leaderboard" | "users"
  groups, teamCodes, knockout, predictions, results, leaderboard, users
  loadingUsers, toast
}
```

Data loads once on mount via `loadData()` which `Promise.all()` fetches all endpoints.

### `constants.ts`

Defines:
- Scoring: `POINTS_EXACT = 5`, `POINTS_OUTCOME = 2`
- Validation: `MIN_PASSWORD_LENGTH = 4`, `MAX_SCORE = 20`
- UI: `PROHIBITED = "🚫"` (used when editing disabled for finished matches)

---

## State Management Pattern

**Lifted state up to `Game` component.** All data (`groups`, `predictions`, `results`, etc.) is fetched once and passed down as props. Child components are controlled:

- `GroupTab` / `KnockoutTab` → call `api.predictions.save()` on change, optimistically update local state
- `UserTab` → calls `api.admin.users.resetPassword()`, then refetches user list (not implemented yet)

No Redux/MobX — simple React `useState` + `useEffect` is sufficient for this app's scope.

---

## Routing

React Router v6:

```tsx
<Routes>
  <Route path="/" element={user ? <Game /> : <Login />} />
  <Route path="*" element={<Navigate to="/" />} />
</Routes>
```

Single-page: always renders either login screen or main game. No deep linking beyond `/`.

---

## Error Handling

- **API errors:** caught in components, displayed via toast message
- **Render errors:** `ErrorBoundary` catches and shows reload button
- **Network failures:** `api.ts` throws `"Request failed"` if `!res.ok`

---

## Styling

All CSS in `index.css` using custom properties (CSS variables):

```css
:root {
  --green: #0a5c36;
  --green-mid: #1a7a4a;
  --green-light: #2d9a5f;
  --gold: #c9a84c;
  --red: #c0392b;
  --bg: #f4f1eb;
  --text: #2c3e50;
}
```

Group stage table uses responsive design with horizontal scroll on small screens. Knockout bracket uses flexbox column layout. Mobile-friendly via media queries.

---

## Environment

Vite dev server proxies `/api` to `http://localhost:3001` (see `vite.config.ts`):

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

---

## Build & Dev

```bash
# Install
cd client
pnpm install

# Dev (with HMR)
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

Output: `client/dist/` (static files served by Vite in dev, could be served by Express in prod).

---

## Adding a New Component

1. Create `src/components/NewComponent.tsx`
2. Define props interface
3. Use `api` client for data fetching (or receive from parent)
4. Export default
5. Import in `App.tsx` and add to render logic or tab

---

## Known Issues / TODOs

- **Email field:** `UserTab` still displays `u.email` but server no longer returns it. Type mismatch — will crash if email is accessed. Need to remove email from `UserTab` (line 69).
- **PDF export:** Uses direct `fetch` with hardcoded `/api/export-pdf` instead of `api` wrapper (no typed endpoint defined).
- **Users list admin check:** Admin tab visible only if `user.isAdmin`, but endpoint requires admin — OK.
- **Cache busting:** Every request appends `?_t=timestamp` — may bloat server logs; could be conditional.
- **Error messages:** Generic "Request failed" — server provides more specific errors; could surface them better.

---

## Consistency with Server

The client types in `types.ts` should mirror server response shapes defined in `server/ARCHITECTURE.md`. Currently aligned:
- `Predictions`, `Results` — match server
- `LeaderboardEntry` — matches `server/types/db.ts:LeaderboardEntry`
- `Groups` — matches `server/services/pdfExport.ts:Groups` (presentation shape, not DB)

Keep `api.ts` endpoint paths in sync with server routes (see server/ARCHITECTURE.md API table).
