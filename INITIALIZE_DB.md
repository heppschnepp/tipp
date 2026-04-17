## Quick Start

1. **Set up WC2026 API key** (required for automatic match result fetching)

   Get a free key from https://wc2026api.com and add to `server/.env`:
   ```
   WC2026_API_KEY=your_key_here
   ```

2. **Start the server**
   
   The server will automatically:
   - Create all database tables
   - Seed 48 teams + all 104 World Cup 2026 matches
   - Begin fetching live results every 15 minutes (first fetch 30s after startup)

3. **Register an admin user** (first user is auto-admin)

   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"yourpassword"}'
   ```

4. **Login to get token**

   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"yourpassword"}'
   ```

## Manual Seeding (Optional)

If you need to reseed teams/matches (e.g., after database reset), call:

```bash
curl -X POST http://localhost:3001/api/admin/seed \
  -H "Authorization: Bearer <admin-token>"
```

This is idempotent – it only inserts missing records. Safe to run multiple times.

**Note**: This does not affect existing user data (predictions, accounts).

## Monitoring Automatic Result Fetching

Check the status of the automatic WC2026 API fetcher:

```bash
curl http://localhost:3001/api/results/status \
  -H "Authorization: Bearer <admin-token>"
```

Key fields:
- `automaticFetching`: should be `true` if WC2026_API_KEY is set
- `lastFetched`: timestamp of most recent successful fetch
- `scheduler.lastError`: any error from last fetch attempt (null if OK)
- `database.total`: number of matches in DB
- `database.withScores`: how many matches have actual scores (updates as games finish)

## Resetting Everything

To wipe all data and start from scratch:

```bash
# Drop all tables (Docker)
docker exec -i mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Passw0rd' -d tipp \
  -Q "EXEC sp_MSforeachtable 'DROP TABLE ?'"

# Or use local sqlcmd
/opt/homebrew/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Password' -d tipp \
  -Q "EXEC sp_MSforeachtable 'DROP TABLE ?'"

# Restart server – tables will be recreated and reseeded automatically
docker-compose restart server
```

To also reset the SQL Server volume (complete wipe):
```bash
docker-compose down -v
docker-compose up -d
```

## Notes

- **No manual result entry**: Admins cannot POST scores – they are fetched automatically from WC2026 API
- **MatchKey mapping**: The scheduler maps WC2026 API's `match_number` to your frontend's expected keys (`gA0`–`gL5` for groups, `ko_r32_0`–`ko_f_0` for knockout)
- **WC2026 API free tier**: 100 requests/day. Scheduler fetches every 15 minutes × 24h = 96 requests/day. Within limit.
