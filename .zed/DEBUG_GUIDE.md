# Zed IDE Debugging Guide
## World Cup 2026 Prediction Game

**Last Updated:** 2026-05-01

---

## Overview

This guide explains how to debug both the backend (Node.js/Express/TypeScript) and frontend (React/TypeScript/Vite) using the **Zed IDE** for this project.

### Project Structure
```
tipp/
├── .zed/
│   ├── debug.json      # Debug configurations (required)
│   └── DEBUG_GUIDE.md  # This guide
├── .vscode/
│   └── launch.json     # VS Code fallback config
├── server/             # Backend - Express/TypeScript
└── client/             # Frontend - React/TypeScript/Vite
```

### Available Ports
- **Backend API:** http://localhost:3001
- **Frontend App:** http://localhost:5173

---

## Files Summary

### ✅ Necessary Files

1. **`.zed/debug.json`** - Debug configurations (REQUIRED)
   - `Debug Backend` - Debugs Express server with TypeScript
   - `Debug Backend (dev)` - Starts and debugs server in one step
   - `Debug Frontend` - Debugs React app in Chrome

2. **`.vscode/launch.json`** - VS Code fallback (optional but recommended)
   - Same configurations, works in Zed too

3. **`.zed/DEBUG_GUIDE.md`** - This debugging guide

---

## Debug Configurations

### 1. Debug Backend
**For debugging the Express server with full TypeScript support.**

- **Label:** Debug Backend
- **Adapter:** `JavaScript`
- **Type:** `node`
- **Entry Point:** `server/src/index.ts`
- **Runtime:** Uses `tsx` (no compilation needed)
- **Source Maps:** ✅ Enabled
- **Environment:** Loads from `server/.env`

This runs TypeScript directly - no build step needed. Perfect for quick debugging.

### 2. Debug Backend (dev)
**For starting and debugging the dev server in one step.**

- **Label:** Debug Backend (dev)
- **Adapter:** `JavaScript`
- **Type:** `node-terminal`
- **Command:** `pnpm run dev`
- **Auto-attach:** Child processes automatically attached

Use this to start the server and debug it together in one click.

### 3. Debug Frontend
**For debugging the React application in Chrome browser.**

- **Label:** Debug Frontend
- **Adapter:** `JavaScript`
- **Type:** `chrome`
- **URL:** http://localhost:5173
- **Source Maps:** ✅ Enabled

**Note:** Start Vite dev server first (`pnpm run dev` in `client/`)

---

## How to Start Debugging

### Backend Debugging

**Option 1: Debug Backend (Recommended - Quick Debug)**

1. Open Zed IDE
2. Press `Cmd/Ctrl + Shift + D` to open debug panel
3. Click the **Start Debugging** dropdown
4. Select **"Debug Backend"**
5. Debugger starts attached to TypeScript process

**Expected Output:**
```bash
Server running on port 3001
```

**Option 2: Debug Backend (dev) - Start & Debug Together**

1. Press `Cmd/Ctrl + Shift + D`
2. Select **"Debug Backend (dev)"**
3. Debugger starts the dev server and attaches automatically

**Option 3: Manual Start + Debug**

1. In Zed terminal: `cd server && pnpm run dev`
2. Wait for: "Server running on port 3001"
3. Press `Cmd/Ctrl + Shift + D`
4. Select **"Debug Backend"**
5. Debugger attaches to running process

### Frontend Debugging

**Manual Start + Debug (Recommended)**

1. In Zed terminal: `cd client && pnpm run dev`
2. Wait for: "Local: http://localhost:5173"
3. Open Chrome to http://localhost:5173
4. In Zed, press `Cmd/Ctrl + Shift + D`
5. Select **"Debug Frontend"**
6. Debugger attaches to Chrome

**Alternative: Chrome DevTools Only**

For frontend-only debugging, skip Zed debugger:
1. Start Vite: `cd client && pnpm run dev`
2. Open Chrome → http://localhost:5173
3. Press `Cmd/Ctrl + Shift + I` to open DevTools
4. Use **Sources** tab for TypeScript debugging

### Full Stack Debugging

1. **Terminal 1:** `cd server && pnpm run dev`
   - Wait for: "Server running on port 3001"
2. **Terminal 2:** `cd client && pnpm run dev`
   - Wait for: "Local: http://localhost:5173"
3. Open http://localhost:5173 in Chrome
4. Start debugging as needed (backend and/or frontend)

---

## How to Stop the Debugger

### Backend (Server) - Stop Methods:

| Method | Action |
|--------|--------|
| **Zed GUI** | Click 🛑 Stop button in debug toolbar |
| **Keyboard** | `Cmd/Ctrl + Shift + F5` |
| **Terminal** | `Ctrl + C` in server terminal |
| **Force Kill** | `pkill -f 'tsx' \|\| true` |

### Frontend (Client) - Stop Methods:

| Method | Action |
|--------|--------|
| **Zed GUI** | Click 🛑 Stop button in debug toolbar |
| **Keyboard** | `Cmd/Ctrl + Shift + F5` |
| **Terminal** | `Ctrl + C` in vite terminal |
| **Force Kill** | `pkill -f 'vite' \|\| true` |

### ⚠️ CRITICAL: Process Management

**Zed's stop button (🛑) only disconnects the debugger!**

When you click 🛑 or press `Cmd/Ctrl + Shift + F5`:
- ✅ The debugger **disconnects** 
- ❌ The server/process **keeps running** in background

**To actually stop the process, you MUST:**
1. Press `Ctrl + C` in the terminal where it's running, OR
2. Use `pkill` commands above

### Full Stop Workflow

**Backend:**
```bash
# 1. Stop debugger in Zed (🛑 or Cmd+Shift+F5)
# 2. Press Ctrl+C in server terminal where pnpm run dev is running
# OR force kill:
pkill -f 'tsx' || true
```

**Frontend:**
```bash
# 1. Stop debugger in Zed (🛑 or Cmd+Shift+F5)
# 2. Press Ctrl+C in vite terminal  
# OR force kill:
pkill -f 'vite' || true
```

**Both:**
```bash
pkill -f 'tsx\|vite' || true
```

---

## No Task Palette in Zed

⚠️ **Important:** Unlike VS Code, Zed does NOT run tasks from `Cmd/Ctrl + P`.

**To start/stop servers:**
- Run commands directly in Zed terminal
- Use `Ctrl + C` to stop

---

## Debugging Tips

### Backend Debugging (Node/Express)

**Set breakpoints in:**
- `server/src/index.ts` - Application entry point
- `server/src/controllers/**/*.ts` - Request handlers
- `server/src/routes/**/*.ts` - Route definitions  
- `server/src/middleware/**/*.ts` - Auth, error handling
- `server/src/services/**/*.ts` - Business logic (PDF, scheduler, API)
- `server/src/validation/**/*.ts` - Zod schemas

**Common breakpoints:**
- Database init: `initDatabase()` (line 36 in index.ts)
- Authentication: login/register controllers
- Prediction save/update logic
- Result scheduler: `resultScheduler.start()` (line 38 in index.ts)
- PDF export generation
- Error handler middleware

**Watch variables:**
- `process.env.*` - Environment variables
- `req` - Express request object
- `res` - Express response object
- Database connection state
- JWT tokens in auth headers

### Frontend Debugging (React/Vite)

**Set breakpoints in:**
- `client/src/App.tsx` - Main application component
- `client/src/pages/**/*.tsx` - Page components
- `client/src/components/**/*.tsx` - Reusable components
- `client/src/hooks/**/*.ts` - Custom hooks
- `client/src/App.tsx` - Router configuration

**Chrome DevTools features:**
- **Elements**: Inspect DOM, styles
- **Console**: View logs, errors
- **Sources**: TypeScript debugging, breakpoints
- **Network**: View API calls to backend, headers, payloads
- **Application**: Local storage, cookies, tokens

**Debug Network Requests:**
1. Open Chrome DevTools (`Cmd/Ctrl + Shift + I`)
2. Go to **Network** tab
3. Filter by `/api` to see backend calls
4. Check request/response payloads
5. Verify JWT tokens in Authorization headers

**Common frontend debug points:**
- React Router navigation (`/`, `/login`, `/predictions`)
- State management (context, reducers)
- API client requests to backend
- Form validation
- Authentication flow (login/register)
- Prediction form submission

---

## Configuration Details

### Backend Debug Config (.zed/debug.json)

```json
{
  "label": "Debug Backend",
  "adapter": "JavaScript",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/server/src/index.ts",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/tsx",
  "cwd": "${workspaceFolder}/server",
  "envFile": "${workspaceFolder}/server/.env",
  "console": "integratedTerminal",
  "sourceMaps": true,
  "skipFiles": ["<node_internals>/**"]
}
```

**Key features:**
- Uses `JavaScript` debug adapter (vscode-js-debug, built into Zed)
- `type: "node"` specifies Node.js environment
- Runs with `tsx` - no separate TypeScript build needed
- Auto-loads environment variables from `.env`
- Source maps enable debugging `.ts` files

### Frontend Debug Config (.zed/debug.json)

```json
{
  "label": "Debug Frontend",
  "adapter": "JavaScript",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:5173",
  "webRoot": "${workspaceFolder}/client/src",
  "sourceMaps": true
}
```

**Key features:**
- Uses same `JavaScript` debug adapter
- `type: "chrome"` specifies Chrome browser
- Attaches to running Chrome instance
- Source maps for debugging React `.tsx` files

**Note:** Both configs use `adapter: "JavaScript"` (same adapter!) with different `type` values.

---

## Quick Reference

| Action | Shortcut |
|--------|----------|
| Open Debug Panel | `Cmd/Ctrl + Shift + D` |
| Start Debugging | Select from dropdown → ▶️ |
| Stop Debugging | `Cmd/Ctrl + Shift + F5` |
| Stop Process | `Ctrl + C` in terminal |
| Kill Process | `pkill -f 'vite\|tsx' || true` |

### URLs

| Service | URL |
|---------|-----|
| Frontend App | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| API Docs | http://localhost:3001/api/** |

---

## Troubleshooting

### Backend Debugger Won't Start

**Error:** "Port 3001 already in use"
- **Fix:** `pkill -f node || true` then restart

**Breakpoints not hitting**
- Verify `sourceMaps: true` in `.zed/debug.json`
- Restart Zed
- Check that `tsx` is installed: `ls node_modules/.bin/tsx`

**"Cannot find tsx"**
- **Fix:** Ensure `pnpm install` was run in both `server/` and root

**"Failed to start" / Database error**
- Check `server/.env` has correct DB credentials
- Ensure database is running (Docker or local MSSQL)

### Frontend Debugger Won't Start

**Error:** "Port 5173 already in use"
- **Fix:** `pkill -f vite || true` then restart

**Chrome not opening / attaching**
- Start Vite manually first: `cd client && pnpm run dev`
- Verify Chrome is installed
- Check that `http://localhost:5173` loads

**White screen / errors in browser**
- Check browser DevTools console (F12)
- Verify backend is running on port 3001

### Debugger Detaches Unexpectedly

**Causes:**
- Process crashed (check terminal for errors)
- Environment variables missing/incorrect
- Database connection failed
- Syntax error in code

**Fix:** Check terminal output for stack traces or error messages

### Breakpoints Not Working

**Backend:**
- Verify `sourceMaps: true` in debug config
- Ensure running with `JavaScript` adapter
- Restart Zed

**Frontend:**
- Ensure Vite running in dev mode
- Check Chrome DevTools → Sources for `.tsx` files
- Disable cache in DevTools (Network tab)

---

## Need Help?

### Check Project Documentation
- [Server Architecture](server/ARCHITECTURE.md)
- [API Examples](README_CURL.md)
- [README](README.md)

### Verify Setup
```bash
# Check Node version
node --version  # Should be >= 18

# Check pnpm
pnpm --version  # Should be >= 9

# Check tsx is installed
ls node_modules/.bin/tsx
```

### Logs and Errors
- **Backend:** Check terminal running `pnpm run dev`
- **Frontend:** Check browser DevTools Console
- **Network:** Check DevTools Network tab for API errors

---

## Summary

✅ **Zed debugging is configured and ready to use!**

### What Was Fixed

Previous attempts used wrong adapter names (`Node`, `JavaScript Debugger`) which Zed doesn't recognize.

**Correct configuration:**
- ✅ `adapter: "JavaScript"` - Zed's built-in vscode-js-debug adapter
- ✅ `type: "node"` for backend
- ✅ `type: "chrome"` for frontend

### Files
- `.zed/debug.json` - 3 debug configurations
- `.vscode/launch.json` - VS Code fallback (works in Zed too)

### Key Takeaway
**Stop button (🛑) only disconnects!** Always use `Ctrl + C` to actually kill processes.

**Created:** 2026-05-01  
**Updated:** 2026-05-01
