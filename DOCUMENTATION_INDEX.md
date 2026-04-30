# Documentation Index

This repository contains comprehensive documentation for the World Cup 2026 Prediction Game.

## Quick Navigation

| Document | Location | Purpose |
|----------|----------|---------|
| **Main README** | `README.md` | Entry point with links to all docs |
| **Deployment** | `DEPLOY_DOCKER.md` | How to deploy with Docker (production & dev) |
| **Server Architecture** | `server/ARCHITECTURE.md` | Backend design, patterns, API reference |
| **Client Architecture** | `client/ARCHITECTURE.md` | Frontend structure, components, state |
| **Development Guide** | `README_DEV.md` | Local setup, environment, quick start |
| **API Examples** | `README_CURL.md` | curl commands for every endpoint |
| **Specification** | `SPEC.md` | Original project spec (prerequisites, database schema) |
| **Env Template** | `server/.env.template` | Template for server environment variables |

---

## Getting Started

### New Developers
1. Read `README.md` → follow links to `README_DEV.md` for local setup
2. Copy `server/.env.template` → `server/.env` and add your `WC2026_API_KEY`
3. Run `docker compose up -d` or local dev instructions

### Ops / Deployment
1. Read `DEPLOY_DOCKER.md` — step-by-step deployment to a Docker host
2. Use `server/.env.template` as reference for required environment variables
3. Ensure `WC2026_API_KEY` is set (scheduler needs it)

### Understanding the Codebase
- Start with `server/ARCHITECTURE.md` (backend) and/or `client/ARCHITECTURE.md` (frontend)
- These docs explain the module structure, patterns, data flow, and how to add features

---

## Document Descriptions

### `README.md` (root)
Top-level entry point — brief project description + table of documentation links. Keep this concise.

### `DEPLOY_DOCKER.md`
Deployment guide covering:
- Prerequisites (Docker, ports, RAM)
- Quick deploy steps (copy → configure → `docker compose up -d`)
- Container overview (SQL Server, Express API, React dev server)
- First-use checklist (register admin, verify scheduler)
- Access URLs, log viewing, restart/rebuild commands
- Configuration: env vars table, `.env` template usage
- Production notes (build types, JWT secret, HTTPS)
- Troubleshooting (memory, ports, scheduler, PDF flags, DB connection)
- Backup/restore procedures
- Update workflow

### `server/ARCHITECTURE.md`
Technical deep-dive into backend:
- Directory structure (post-refactor: controllers, routes, middleware, validation, types, services)
- Request flow (middleware stack: validation → auth → admin → controller)
- Key patterns: Zod validation middleware, async error handling, type safety
- Validation schemas table (with coercion details)
- Database schema (all `tipp_*` tables, MatchKey conventions)
- Services overview (scheduler, seed, simulation, PDF, WC2026 API client)
- Full API endpoint matrix (public, authenticated, admin)
- Error handling flow
- Environment variables reference
- "How to add a new endpoint" quick-start

### `client/ARCHITECTURE.md`
Frontend architecture:
- Directory structure (main.tsx, App.tsx, api.ts, types.ts, components/)
- `api.ts` — typed fetch wrapper with cache-busting, JWT injection
- `types.ts` — interfaces (User, Predictions, Results, LeaderboardEntry, Groups, etc.) + utilities (`parseScore`, constants)
- Components table with state/props summary
- State management pattern (lifted to `Game` component)
- Routing (React Router v6 — single route with conditional render)
- Styling (CSS variables, responsive)
- Build/dev commands
- Known TODOs (email field mismatch, PDF export bypassing api wrapper)

### `README_DEV.md`
Developer quick-start:
- Prerequisites (Docker Desktop, Docker Compose)
- Quick start (`docker-compose up -d`)
- Services table (client:5173, server:3001, sqlserver:1433)
- First run steps (register admin, scheduler auto-start)
- Database info (persisted in volume, auto-seeding)
- WC2026 API auto-fetch explanation (every 15 min, rate limits)
- Monitoring (`/api/results/status`)
- Manual override (`/api/admin/seed`)
- Resetting data (drop tables, volume remove)
- Notes on MatchKey mapping, rate limits, no manual entry

### `README_CURL.md`
Ready-to-run curl examples for:
- Creating admin
- Getting token
- Seeding
- Admin: list users, reset password
- Simulation (run, status, cleanup)
- Complete test workflow (1–7 steps)

### `SPEC.md`
Original specification:
- Project overview, tech stack, architecture diagram
- Database schema (SQL statements)
- REST API endpoints (pre-refactor — some may differ)
- UI/UX spec (pages, components, theme colors)
- Security notes
- Docker configuration (original)
- Acceptance criteria

### `server/.env.template`
Template for server environment variables. Copy to `server/.env` and edit. Includes:
- Database connection
- JWT settings
- WC2026_API_KEY (required)
- FLAGS_DIR
- PORT

---

## Maintainer Notes

When making code changes:
1. Update relevant architecture doc if module structure changes
2. Update API endpoint tables if routes change
3. Keep `.env.template` in sync with actual required environment variables
4. Run `npm run lint` and `npm run build` in both client and server before committing
