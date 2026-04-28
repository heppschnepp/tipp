# Development Guide - World Cup 2026 Prediction Game

## prerequisites

- Docker Desktop
- Docker Compose

## Quick Start (Docker)

```bash
cd tipp
docker-compose up -d
```

Wait ~30 seconds for services to start, then access:
- **Client**: http://localhost:5173
- **API**: http://localhost:3001

## Services

| Service   | Port | Description |
|----------|-----|-------------|
| client   | 5173 | React/Vite frontend |
| server   | 3001 | Express REST API |
| sqlserver | 1433 | MSSQL Server database |

### Volumes

- `sqlserver_data` — Database persistence
- `flags_share` — Shared flag images between client and server (mounted at `/app/public/flags` in server)

## First Run

1. Open http://localhost:5173
2. Register first user → becomes admin automatically
3. Register additional users

**Note**: Match results are fetched automatically from the WC2026 API every 15 minutes. No manual data entry required.

## Development (Without Docker)

### Database (MSSQL)

**Option A: Docker**
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Passw0rd" \
  -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
```

**Option B: Local SQL Server**
- Install SQL Server 2022+
- Create database `tipp`
- Update connection in `server/.env`

### Server

```bash
cd tipp/server
pnpm install
pnpm run dev
```

Runs on http://localhost:3001

### Client

```bash
cd tipp/client
pnpm install
pnpm run dev
```

Runs on http://localhost:5173

## Environment Variables

### server/.env
```
PORT=3001
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=tipp
DB_USER=lportal
DB_PASSWORD=lportal
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# WC2026 API Configuration (REQUIRED for automatic result fetching)
# Get your free key from https://wc2026api.com
WC2026_API_KEY=your_wc2026_api_key_here

# PDF Export: Path to flag image directory (PNG files).
# Used by server when generating PDFs. Leave unset for default.
# Default (dev): ../client/public/flags relative to server working dir
# Default (Docker): /app/public/flags (mounted automatically)
FLAGS_DIR=/app/public/flags
```

**Important**: Without `WC2026_API_KEY`, match results will not be fetched automatically. The server will start but scheduler will be disabled.

## Database

- **Stored in container**: Yes, MSSQL runs inside the `sqlserver` container
- **Persistence**: Volume `sqlserver_data` in docker-compose.yml
- **Table prefix**: `tipp_` (tipp_Users, tipp_Predictions, tipp_MatchResults, etc.)
- **Automatic seeding**: On first startup, the server inserts all 48 teams, 104 matches (group + knockout), and TBD placeholder automatically.

## Automatic Result Fetching

The server automatically retrieves live match results from the **WC2026 API** (free API for World Cup 2026 data).

### How it works:
- **Scheduler** runs every 15 minutes starting 30 seconds after server boot
- Fetches all fixtures from WC2026 API
- For matches with non-null scores → upserts into `tipp_MatchResults`
- Sets `LastFetchedAt` timestamp on each update
- Match keys follow your frontend convention: `gA0` (Group A match 0), `ko_r32_0` (Round of 32)

### Monitoring:
Check fetch status via admin endpoint:

```bash
# Login to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r .token)

# View status
curl http://localhost:3001/api/results/status \
  -H "Authorization: Bearer $TOKEN" | jq
```

### PDF Export

PDF generation is handled server-side. The endpoint builds a PDF with group stage tables and knockout brackets, embedding flag images directly from the server's filesystem.

- **Endpoint**: `GET /api/export-pdf` (auth required)
- **Response**: `application/pdf` attachment, filename includes current date
- **Flags**: The server reads flag PNGs from `server/public/flags` (mounted/copied there). In Docker, ensure the server container has access to the flag images (see Docker notes below).

**Docker note**: PDF export requires flag images available to the server. In the provided Docker setup, the flags are not mounted by default. If you need PDF export in Docker, either:
- Copy flags into the server image (adjust Dockerfile), or
- Mount a shared volume from client `public/flags` into the server container at the expected path

Response:
```json
{
  "automaticFetching": true,
  "lastFetched": "2026-04-17T11:00:00.000Z",
  "scheduler": {
    "isRunning": false,
    "lastRun": "2026-04-17T11:00:00.000Z",
    "lastError": null
  },
  "database": {
    "total": 24,
    "withScores": 24
  }
}
```

- `lastFetched`: most recent successful fetch timestamp
- `scheduler.lastError`: any error from last run (null if OK)
- `database.total`: number of matches stored in DB (with or without scores)
- `database.withScores`: matches that have actual scores populated

### Manual override / re-seeding:
If you need to refresh the team/match schedule (rare), call:

```bash
curl -X POST http://localhost:3001/api/admin/seed \
  -H "Authorization: Bearer $TOKEN"
```

This is idempotent – safe to run multiple times. It only inserts missing teams/matches; it does **not** delete existing data.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login, returns JWT token |
| GET | /api/auth/me | Yes | Get current user info |
| GET | /api/predictions | Yes | Get user's predictions |
| POST | /api/predictions | Yes | Save/update prediction |
| DELETE | /api/predictions/:matchKey | Yes | Clear a prediction |
| GET | /api/results | No | Get match results (scores from WC2026 API) |
| GET | /api/results/status | Admin | Check automatic fetch status |
| GET | /api/leaderboard | No | Get rankings with points |
| GET | /api/groups | No | Get group stage teams and structure |
| GET | /api/knockout | No | Get knockout bracket structure |
| GET | /api/team-codes | No | Get team name → flag code mapping |
| GET | /api/export-pdf | Yes | Download PDF of all matches & predictions |

## Common Issues

### WC2026 API key missing
If `lastFetched` stays `null` and `automaticFetching` is `false`, check that `WC2026_API_KEY` is set in `server/.env` and server was restarted.

### SQL Server won't start
```bash
# Check logs
docker-compose logs sqlserver

# Increase memory if needed (SQL Server requires ~2GB)
```

### Connection refused
- Wait 20-30 seconds for SQL Server to initialize
- Check DB_SERVER in docker-compose.yml matches container name

### Port already in use
```bash
# Stop other SQL Server instances
docker ps
docker stop <container_id>
```

## Build for Production

```bash
cd tipp
docker-compose -f docker-compose.yml build
docker-compose up -d
```

## Resetting the Application

To completely wipe all data and start fresh:

```bash
# Drop all tables
docker exec mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Passw0rd' -d tipp \
  -Q "EXEC sp_MSforeachtable 'DROP TABLE ?'"

# Restart server (tables will be recreated and reseeded automatically)
docker-compose restart server
```

Or simply bring down the volume:
```bash
docker-compose down -v
docker-compose up -d
```

This removes all users, predictions, and match results.
