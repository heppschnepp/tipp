# World Cup 2026 Prediction Game

Full-stack prediction game built with React, Express, TypeScript, and PostgreSQL.

## Database

The application uses PostgreSQL as its database. To interact with the database directly on macOS, you can install the PostgreSQL client tools via Homebrew:

```bash
brew install libpq   # installs psql and related tools
# Add to your PATH if needed (brew info libpq will show the command)
```

Then connect to the database (using defaults from `.env`):

```bash
psql -h localhost -p 5432 -U lportal -d tipp
# Password: lportal (from .env)
```

Once connected, you can run SQL queries. For example:

```sql
SELECT * FROM tipp_teams LIMIT 5;
```

To drop all tables (useful for resetting), you can use the provided script:

```bash
psql -h localhost -p 5432 -U lportal -d tipp -f drop_tables.sql
```

Make sure the server is not running when dropping tables to avoid inconsistencies.

## Documentation

| Document | Purpose |
|----------|---------|
| [Deployment Guide](./DEPLOY_DOCKER.md) | Deploy to Docker (production & dev) |
| [Server Architecture](./server/ARCHITECTURE.md) | Server design, patterns, modules, API endpoints |
| [Client Architecture](./client/ARCHITECTURE.md) | React app structure, components, API client, state |
| [Development Guide](./README_DEV.md) | Local development, environment, quick start |
| [API Examples](./README_CURL.md) | curl commands for all endpoints |
| [Specification](./SPEC.md) | Original project specification |
| [Docs Index](./DOCUMENTATION_INDEX.md) | Master index of all documentation |
