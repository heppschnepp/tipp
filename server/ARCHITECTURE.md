# Server Architecture

## Overview

The server is an Express + TypeScript REST API for the World Cup 2026 Prediction Game. After refactoring, it follows a clean ** layered architecture with separation of concerns.

## Directory Structure

```
server/src/
├── index.ts                    # Application entry point (40 lines)
├── db.ts                       # Database connection & schema initialization
├── types/
│   └── db.ts                   # Database row type definitions
├── middleware/
│   ├── auth.ts                 # JWT authentication & admin checks
│   └── errorHandler.ts         # Centralized error handling + async wrapper
├── validation/
│   ├── validate.ts             # Zod validation middleware factory
│   └── schemas.ts              # All Zod request schemas + type exports
├── controllers/
│   ├── auth.controller.ts      # register, login, getMe
│   ├── predictions.controller.ts # CRUD for user predictions
│   ├── results.controller.ts   # get results, get fetch status
│   ├── leaderboard.controller.ts # scoring & ranking logic
│   ├── groups.controller.ts    # groups, flags, knockout structure
│   └── admin.controller.ts     # admin-only operations
├── routes/
│   ├── auth.routes.ts          # /api/auth/*
│   ├── predictions.routes.ts   # /api/predictions/*
│   ├── admin.routes.ts         # /api/admin/*
│   ├── public.routes.ts        # /api/groups, /api/leaderboard, etc.
│   ├── team-codes.routes.ts    # /api/team-codes
│   └── export.routes.ts        # /api/export-pdf
└── services/
    ├── scheduler.ts            # WC2026 API auto-fetch (every 15 min)
    ├── seed.ts                 # Database seeding (teams, matches)
    ├── simulation.ts           # Test data generation
    ├── pdfExport.ts            # PDF generation
    └── wc2026.ts               # WC2026 API client
```

---

## Request Flow

```
[Incoming Request]
     ↓
[Express Router mounted at /api/auth, /api/predictions, etc.]
     ↓
[Validation Middleware] ← validate(schema) → Zod parses & validates
     ↓
[Auth Middleware] (if route requires it) ← authMiddleware → verifies JWT
     ↓
[Admin Middleware] (if route requires it) ← adminMiddleware → checks req.user.isAdmin
     ↓
[Controller] ← receives typed req.body (validated data) + req.user (if authenticated)
     ↓
[Service Layer] (optional) ← business logic in services/
     ↓
[Database] ← db.ts provides getDb() connection pool
     ↓
[Response] ← JSON or file (PDF)
     ↓
[Error Handler] ← asyncHandler catches all errors → errorHandler → 500/4xx JSON
```

---

## Key Patterns

### 1. Validation Middleware (`validation/validate.ts`)

```typescript
export function validate<T>(schema: ZodType<T>) {
  return (req: ValidatedRequest<T>, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }
    req.validated = result.data;
    next();
  };
}
```

Usage in routes:
```typescript
router.post("/register", validate(registerSchema), register);
```

The validated, type-safe data is available as `req.validated` (or in controller type: `req.body` with `Request<unknown, unknown, InputType>`).

### 2. Async Error Handling (`middleware/errorHandler.ts`)

All async route handlers are wrapped with `asyncHandler(controllerFn)` to catch rejected promises and forward errors to `errorHandler`. Without this, unhandled rejections crash the request (ECONNRESET).

```typescript
router.post("/login", validate(loginSchema), asyncHandler(login));
```

### 3. Type Safety

- **Request bodies**: `Request<Params, ResBody, ReqBody>` generic specifies shape
- **Validated data**: `req.body` contains validated and coerced values (Zod preprocessing handles string→number conversion, empty→null)
- **Database rows**: Types from `types/db.ts` represent SQL result sets

---

## Validation Schemas (`validation/schemas.ts`)

| Schema | Fields | Coercion |
|--------|--------|----------|
| `registerSchema` | username (str, min 1, max 50), password (str, min 8) | none |
| `loginSchema` | username (str, min 1), password (str, min 1) | none |
| `predictionSchema` | matchKey (str), homeScore/awayScore (int ≥0, nullable) | empty string → null, string number → integer |
| `resetPasswordSchema` | userId (positive int), newPassword (str, min 8) | string→number |
| `simulationSchema` | playerCount (int 1-100, optional) | string→number, undefined → default |

** coercion logic:**
- Prediction scores accept string or number inputs (from HTML forms). `preprocess()` converts `""` to `null` and numeric strings to numbers.
- `userId` from admin reset-password forms often arrives as string; preprocess converts to number.

---

## Database Layer (`db.ts`)

- Connection pooling via `mssql` package
- `getDb()` returns a singleton `ConnectionPool` (reuses if already connected)
- `initDatabase()` creates all tables if they don't exist (idempotent)
- Uses parameterized queries (`request.input()`) to prevent SQL injection

### Current Schema (tables with `tipp_` prefix):

- `tipp_Users` — accounts (Id, Username, PasswordHash, IsAdmin, CreatedAt)
- `tipp_Predictions` — user predictions (UserId, MatchKey, HomeScore, AwayScore, unique per user+match)
- `tipp_MatchResults` — actual scores (MatchKey, HomeScore, AwayScore, IsKnockout, RoundName, LastFetchedAt)
- `tipp_GameSessions` — optional grouping of players
- `tipp_SessionPlayers` — many-to-mession
- `tipp_Teams` — team names, codes, groups
- `tipp_Matches` — match schedule (MatchKey, HomeTeamId, AwayTeamId, GroupName, MatchType, RoundName, MatchOrder)

### MatchKey Convention

- **Group stage**: `gA0`, `gA1`, … `gL5` (6 matches per group × 12 groups = 72 total including TBD)
- **Knockout**: `ko_r32_0` … `ko_r32_15` (Round of 32), `ko_r16_0` … `ko_f_0` (Final)

---

## Services (`services/`)

| Service | Responsibility |
|---------|----------------|
| `scheduler.ts` | `ResultScheduler` class — fetches all WC2026 matches every 15 min, upserts scores into `tipp_MatchResults` |
| `seed.ts` | `seedDatabase()` — inserts 48 teams, 104 matches (group + knockout), ensures idempotency |
| `simulation.ts` | `Simulator` class — creates N test users, random predictions, random results |
| `pdfExport.ts` | `generatePdf()` — builds PDF with jsPDF + jspdf-autotable, embeds flag images |
| `wc2026.ts` | `WC2026Service` — fetches from external WC2026 API, handles caching |

---

## API Endpoints

### Public (no auth)

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| POST | `/api/auth/register` | `auth.register` | Create account |
| POST | `/api/auth/login` | `auth.login` | Get JWT token |
| GET | `/api/predictions` | `predictions.getUserPredictions` | List current user's predictions |
| GET | `/api/results` | `results.getResults` | All match scores |
| GET | `/api/leaderboard` | `leaderboard.getLeaderboard` | Ranked players |
| GET | `/api/groups` | `groups.getGroups` | Group stage teams + matches |
| GET | `/api/flags` | `groups.getFlags` | Team → emoji flag mapping |
| GET | `/api/knockout` | `groups.getKnockoutRounds` | Knockout bracket structure |
| GET | `/api/team-codes` | `team-codes` | Raw ISO code mapping |

### Authenticated (JWT required)

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/auth/me` | `auth.getMe` | Current user profile |
| POST | `/api/predictions` | `predictions.savePrediction` | Save/update prediction |
| DELETE | `/api/predictions/:matchKey` | `predictions.deletePrediction` | Clear prediction |
| GET | `/api/export-pdf` | `export` | Download PDF with predictions |

### Admin only (JWT + isAdmin=true)

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| POST | `/api/admin/reset-password` | `admin.resetPassword` | Set new password for user |
| POST | `/api/admin/simulate` | `admin.simulate` | Generate test data |
| POST | `/api/admin/cleanup-simulation` | `admin.cleanupSimulation` | Remove test data |
| GET | `/api/admin/simulate/status` | `admin.getSimulationStatus` | Check simulation state |
| POST | `/api/admin/seed` | `admin.seedData` | Insert teams/matches |
| GET | `/api/admin/users` | `admin.getUsers` | List all users |

---

## Error Handling

All errors flow through `errorHandler` middleware (registered last in `index.ts`):

```typescript
app.use(errorHandler);
```

**Behavior:**
- `4xx` errors from validation/auth are already sent before reaching handler
- Uncaught errors from any controller → caught by `asyncHandler` → passed to `errorHandler`
- Logs error to console, returns `{ error: message }` with appropriate status

**Custom error types:** Extend `ApiError` with `statusCode?: number` for domain errors (not yet used; currently middleware infers status from context).

---

## Environment Variables

See `server/.env` or `README_DEV.md` for full list.

**Key ones:**
- `PORT` — server port (default 3001)
- `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — MSSQL connection
- `JWT_SECRET` — signing secret for tokens
- `JWT_EXPIRES_IN` — token expiry in seconds (default 604800 = 7d)
- `WC2026_API_KEY` — required for automatic result fetching (scheduler disabled without it)
- `FLAGS_DIR` — path to flag PNGs for PDF export (default: `../client/public/flags` relative to server working dir)

---

## Testing the API

Use `README_CURL.md` for ready-to-run curl examples.

Quick test after starting server:

```bash
# 1. Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# 2. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# 3. Get predictions (requires token)
curl http://localhost:3001/api/predictions \
  -H "Authorization: Bearer <token>"
```

---

## Adding a New Endpoint

1. **Add schema** to `validation/schemas.ts` (if request has body)
2. **Add controller** function in `controllers/` (or extend existing)
3. **Add route** to appropriate `routes/*.ts`:
   ```typescript
   import { validate } from '../validation/validate.js';
   import { mySchema } from '../validation/schemas.js';
   import { myHandler } from '../controllers/my.controller.js';
   import { asyncHandler } from '../middleware/errorHandler.js';

   router.post("/my-endpoint", validate(mySchema), asyncHandler(myHandler));
   ```
4. **Export** the router from its file and mount in `index.ts` if it's a new router
5. **Update this doc** with the new endpoint details

---

## Notes

- **Email removed**: The `Email` column still exists in DB but is no longer used. New registrations don't supply email; API responses omit it.
- **No manual result entry**: `POST /api/results` returns 410 Gone — results come only from WC2026 API scheduler.
- **PDF export**: Server reads flag PNGs from filesystem; ensure `FLAGS_DIR` is set correctly in Docker.
- **TypeScript strictness**: ESLint configured; run `npm run lint` before committing.
- **Zod**: Used for runtime validation + type inference; version ^4.4.1.
