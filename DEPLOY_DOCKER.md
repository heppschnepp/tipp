# Deployment Guide — Docker

This guide covers deploying the World Cup 2026 Prediction Game to a server running Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+ installed and running
- Docker Compose plugin (`docker compose`) installed
- At least 3 GB free RAM (SQL Server needs ~2 GB)
- Ports `5173`, `3001`, `1433` available on the host

---

## Quick Deploy (3 steps)

### 1. Copy files to your server

```bash
# Clone or copy the repository to your server
git clone <your-repo-url> tipp
cd tipp
```

Or upload the extracted folder via SCP/SFTP.

### 2. Configure environment

The server reads configuration from environment variables. You have two options:

#### Option A: Use `.env` file (recommended)

```bash
# Copy the template (included in the repo)
cp server/.env.template server/.env

# Edit server/.env with your values
nano server/.env
```

**Important:** Set `WC2026_API_KEY` (required) and change `JWT_SECRET` for production. The server uses `dotenv` to load `server/.env` automatically on startup.

#### Option B: Edit `docker-compose.yml`

Modify the `server.environment` section directly in `docker-compose.yml`. This is useful for one-off changes or CI/CD pipeline injection.

**Note:** The `.env` file is ignored by git — never commit secrets.

### 3. Start all services

```bash
docker compose up -d
```

That's it. Docker Compose will:
- Pull `mcr.microsoft.com/mssql/server:2022-latest` (SQL Server)
- Build and start the server (Express API on port 3001)
- Build and start the client (React dev server on port 5173)
- Create a persistent volume for the database

**Wait ~30 seconds** for SQL Server to initialize, then open http://localhost:5173 in your browser (or your server's IP).

---

## What Gets Deployed

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `tipp-sqlserver` | `mcr.microsoft.com/mssql/server:2022-latest` | `1433` | MSSQL database (volume: `sqlserver_data`) |
| `tipp-server` | Built from `server/Dockerfile` | `3001` | Express REST API |
| `tipp-client` | Built from `client/Dockerfile` | `5173` | React + Vite dev server |

**Volumes:**
- `sqlserver_data` — persists database across container restarts
- Bind mount: `./client/public/flags` → `/app/public/flags` in server (for PDF export)

---

## First Use

1. **Open the app** → http://localhost:5173 (or `http://<your-server-ip>:5173`)
2. **Register the first user** — becomes admin automatically
3. **Login** with that account
4. **Verify scheduler** — results should fetch automatically within ~30 seconds. Check status:

   ```bash
   # Get admin token (replace with your credentials)
   TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"yourpassword"}' | jq -r .token)

   # Check status
   curl http://localhost:3001/api/results/status \
     -H "Authorization: Bearer $TOKEN" | jq
   ```

   `automaticFetching` should be `true`, `lastFetched` should show a timestamp once the first fetch completes. If not, verify `WC2026_API_KEY` is set correctly in `server/.env`.

---

## Accessing the App

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Main React app |
| http://localhost:3001 | Express API (direct) |
| http://localhost:5173/api/... | Proxied API calls (via Vite) |
| http://localhost:3001/api/export-pdf | PDF download (auth required) |

From outside your server, replace `localhost` with your server's IP or domain.

---

## Managing the Stack

### View logs

```bash
# All services
docker compose logs

# Specific service
docker compose logs -f server
docker compose logs -f client
docker compose logs -f sqlserver
```

### Restart a service

```bash
docker compose restart server
docker compose restart client
docker compose restart sqlserver
```

### Stop all services

```bash
docker compose down
```

### Stop + remove database (nuclear option)

```bash
docker compose down -v
# This deletes the sqlserver_data volume → all user data, predictions, results lost
```

### Rebuild after code changes

If you update the code and redeploy:

```bash
docker compose build --no-cache
docker compose up -d
```

Or rebuild a single service:

```bash
docker compose build server
docker compose up -d server
```

---

## Configuration

### Environment Variables Reference

**Two ways to configure:**

1. **Using `.env` file** (recommended) — Create `server/.env` from the template (`server/.env.template`). The server uses `dotenv` to load it automatically. Docker Compose also loads `.env` in the project root for its own variables.

2. **Edit `docker-compose.yml`** — Modify the `server.environment` section inline.

**Server environment variables** (from `server/.env` or `docker-compose.yml`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `DB_SERVER` | `sqlserver` | DB host (matches Docker service name) |
| `DB_PORT` | `1433` | DB port |
| `DB_NAME` | `tipp` | Database name |
| `DB_USER` | `lportal` | DB username |
| `DB_PASSWORD` | `lportal` | DB password |
| `JWT_SECRET` | `your-super-secret...` | **Change in production.** JWT signing key — generate with `openssl rand -base64 64` |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiry (e.g., `7d`, `24h`) |
| `FLAGS_DIR` | `/app/public/flags` | Path to flag PNGs for PDF export |
| `WC2026_API_KEY` | *(none)* | **Required.** Free key from https://wc2026api.com for automatic match result fetching |

**Client environment variables** (`docker-compose.yml` → `client.environment`):

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `http://server:3001` | API base URL for Vite proxy (inside Docker network) |

**Important:** The client's Vite dev server uses the `VITE_API_URL` env var to set its proxy target (see `client/vite.config.ts`). Inside Docker, `server:3001` resolves to the server container. On the host, use `localhost:3001`.

---

## Production Notes

### Use production build

The current `Dockerfile`s run dev servers (for development). For production:

**Server Dockerfile** — already configured:
```dockerfile
RUN npm run build  # compiles TypeScript
CMD ["npm", "start"]  # runs compiled dist/index.js
```

**Client Dockerfile** — change to production build:

```dockerfile
# client/Dockerfile (production variant)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
```

Or use `docker-compose.prod.yml` with production overrides.

### Secure JWT secret

Generate a strong random secret and set it via `.env`:

```bash
# Generate
openssl rand -base64 64

# Add to .env
JWT_SECRET=your-generated-secret-here
```

### Change default DB credentials

Edit `docker-compose.yml` `server.environment` section and update:
- `DB_USER`
- `DB_PASSWORD`

The server's `db.ts` will use these to connect. SQL Server SA password remains `YourStrong@Passw0rd` (set in `sqlserver.environment`).

### Enable HTTPS

For production, terminate TLS at a reverse proxy (NGINX, Traefik, Caddy) in front of the client and server, or configure Vite/NGINX in the client container to serve over HTTPS.

---

## Troubleshooting

### SQL Server won't start (container exits)

```bash
# Check logs
docker compose logs sqlserver

# Common issue: insufficient memory
# SQL Server needs ~2 GB. Increase Docker Desktop memory limit (Settings → Resources)
```

### "Connection refused" when accessing client

```bash
# Check all containers are running
docker compose ps

# If client/server are restarting, check logs
docker compose logs -f client
docker compose logs -f server
```

### Port already in use

Change host port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3002:3001"  # host:container
  - "5174:5173"
```

### Scheduler not fetching results

Verify `WC2026_API_KEY` is set:

```bash
docker compose exec server env | grep WC2026
```

Check status:

```bash
curl http://localhost:3001/api/results/status -H "Authorization: Bearer <token>"
```

### PDF export fails (missing flags)

The server expects flag images at `/app/public/flags` inside the container. The bind mount `./client/public/flags` → `/app/public/flags` should work if paths are correct.

Verify inside server container:

```bash
docker compose exec server ls /app/public/flags
```

Should list 48+ `.png` files.

### Database connection errors

Ensure the server waits for SQL Server to be ready. The `depends_on` only checks container start, not health. If server starts too fast, it will retry connections (handled in `db.ts`). Check server logs for "Database initialized".

---

## Backup & Restore

### Backup database

```bash
# Export from running container
docker exec -i tipp-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Passw0rd' -d tipp \
  -Q "BACKUP DATABASE tipp TO DISK = '/var/opt/mssql/backup/tipp.bak'"

# Copy from host (volume is at ./sqlserver_data)
docker stop tipp-sqlserver
cp -r sqlserver_data/../backup ./backup/
```

### Restore database

```bash
# Stop server (optional)
docker compose stop server

# Restore from backup file mounted/copied into container
docker exec -i tipp-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Passw0rd' \
  -Q "RESTORE DATABASE tipp FROM DISK = '/var/opt/mssql/backup/tipp.bak' WITH REPLACE"

# Restart
docker compose start server
```

---

## Updating the Application

1. Pull code changes
2. Rebuild affected services:

```bash
git pull origin main
docker compose build --no-cache
docker compose up -d
```

3. Migrations are handled automatically by `db.ts` — tables are created/updated on startup.

---

## Support

- Server issues → check `server/ARCHITECTURE.md`
- Client issues → check `client/ARCHITECTURE.md`
- API reference → check `README_CURL.md`
- Full spec → `SPEC.md`
