# Zed IDE Debugging - Setup Complete ✓

## Summary

Fixed and configured debugging for your Node.js/TypeScript/React (World Cup 2026 Prediction Game) project to work with Zed IDE.

## Files Created

### ✅ `.zed/debug.json` - Main Debug Config
3 debug configurations using Zed's correct format:

1. **Debug Backend** - Quick debug of TypeScript backend via `tsx`
2. **Debug Backend (dev)** - Start + debug server in one step
3. **Debug Frontend** - Debug React app in Chrome

### ✅ `.zed/DEBUG_GUIDE.md` - Complete Documentation
Full guide with:
- How to start/stop debugging for both backend and frontend
- Critical warning about Zed's stop button (disconnects but doesn't kill!)
- Breakpoint suggestions
- Troubleshooting tips

### ✅ `.vscode/launch.json` - VS Code Fallback
Compatible configuration that also works in Zed

---

## What Was Fixed

### The Problem
Previous configs used wrong adapter names that Zed doesn't recognize:
- ❌ `"adapter": "Node"` → Wrong!  
- ❌ `"adapter": "JavaScript Debugger"` → Wrong!

### The Solution
Zed requires the **exact** adapter name from its built-in `vscode-js-debug`:
- ✅ `"adapter": "JavaScript"` → ✓ Correct!

And you must specify the environment type:
- ✅ `"type": "node"` for backend
- ✅ `"type": "chrome"` for frontend

---

## How to Use

### Start Backend Debugger

**Quick debug (TypeScript, no build):**
1. `Cmd/Ctrl + Shift + D`
2. Select **"Debug Backend"** → ▶️

**Or start & debug together:**
1. `Cmd/Ctrl + Shift + D`  
2. Select **"Debug Backend (dev)"** → ▶️

### Start Frontend Debugger

1. Start Vite: `cd client && pnpm run dev`
2. `Cmd/Ctrl + Shift + D`
3. Select **"Debug Frontend"** → ▶️
4. Chrome opens at http://localhost:5173

---

## ⚠️ CRITICAL: How to STOP the Debugger

This is the most important part!

### Zed's Stop Button Only Disconnects!

When you click 🛑 or press `Cmd/Ctrl + Shift + F5`:
- ✅ Debugger **disconnects**
- ❌ Process **keeps running** in background!

### To Actually STOP the Process:

**You MUST press `Ctrl + C` in the terminal** where `pnpm run dev` is running

**OR use kill commands:**
```bash
# Backend
pkill -f 'tsx' || true

# Frontend  
pkill -f 'vite' || true

# Both
pkill -f 'tsx\|vite' || true
```

### Workflow Example

```bash
# 1. Start debugging in Zed (disconnects when you click 🛑)

# 2. ACTUALLY STOP - Press Ctrl+C in the terminal
cd server && pnpm run dev
# ^ Press Ctrl+C here to stop

# OR force kill everything
pkill -f 'tsx\|vite' || true
```

---

## Quick Reference

| Action | Shortcut |
|--------|----------|
| Open Debug Panel | `Cmd/Ctrl + Shift + D` |
| Stop Debugging | `Cmd/Ctrl + Shift + F5` |
| **Stop Process** | `Ctrl + C` in terminal |
| Kill Process | `pkill -f 'tsx\|vite' || true` |

---

## Troubleshooting

If debugging doesn't work:

1. **Check adapter name** - Must be `"JavaScript"` (exact case)
2. **Check type** - Must be `"node"` or `"chrome"`
3. **Restart Zed** - Sometimes needed to pick up config changes
4. **Check .env** - Ensure `server/.env` exists and is correct
5. **Verify tsx** - Should be in `node_modules/.bin/tsx`

---

## Config Details

### Backend Config
```json
{
  "adapter": "JavaScript",
  "type": "node",
  "program": "server/src/index.ts",
  "runtimeExecutable": "node_modules/.bin/tsx",
  "cwd": "server",
  "sourceMaps": true
}
```

### Frontend Config
```json
{
  "adapter": "JavaScript",
  "type": "chrome",
  "url": "http://localhost:5173",
  "webRoot": "client/src",
  "sourceMaps": true
}
```

Both use the **same adapter** (`JavaScript`) with different `type` values!

---

## Documentation

Full guide available at: `.zed/DEBUG_GUIDE.md`

Includes:
- Breakpoint suggestions
- Chrome DevTools tips
- Common workflows
- Troubleshooting

---

**Setup Date:** 2026-05-01  
**Status:** ✅ Ready to debug!