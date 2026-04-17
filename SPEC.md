# World Cup 2026 Prediction Game - Full Stack Specification

## Project Overview

- **Project Name**: World Cup 2026 Prediction Game
- **Type**: Full-stack web application with REST API
- **Core Functionality**: Multiplayer prediction game where users register, login, predict match scores, earn points based on correctness
- **Target Users**: Multiple players on separate devices participating in a prediction pool

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: MSSQL Server
- **Deployment**: Docker container

### Project Structure
```
tipp/
├── client/           # React frontend (Vite)
├── server/           # Express REST API
├── docker-compose.yml
└── SPEC.md
```

## Database Schema (MSSQL)

### Tables

```sql
-- Users table
CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(50) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Email NVARCHAR(100),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    IsAdmin BIT DEFAULT 0
);

-- Predictions table
CREATE TABLE Predictions (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT FOREIGN KEY REFERENCES Users(Id),
    MatchKey NVARCHAR(20) NOT NULL,  -- e.g., 'gAm0', 'ko_r16_0'
    HomeScore INT,
    AwayScore INT,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    UNIQUE(UserId, MatchKey)
);

-- Match Results (actual results - admin only)
CREATE TABLE MatchResults (
    Id INT PRIMARY KEY IDENTITY(1,1),
    MatchKey NVARCHAR(20) UNIQUE NOT NULL,
    HomeScore INT,
    AwayScore INT,
    IsKnockout BIT DEFAULT 0,
    RoundName NVARCHAR(50),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- Game Sessions (optional grouping of players)
CREATE TABLE GameSessions (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    CreatedBy INT FOREIGN KEY REFERENCES Users(Id),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);

-- Session Players
CREATE TABLE SessionPlayers (
    SessionId INT FOREIGN KEY REFERENCES GameSessions(Id),
    UserId INT FOREIGN KEY REFERENCES Users(Id),
    JoinedAt DATETIME2 DEFAULT GETDATE(),
    PRIMARY KEY (SessionId, UserId)
);
```

## REST API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login, returns JWT token
- `GET /api/auth/me` - Get current user info

### Predictions
- `GET /api/predictions` - Get all predictions for logged-in user
- `POST /api/predictions` - Save/update predictions
- `GET /api/predictions/:userId` - Get another user's predictions (for leaderboard)
- `DELETE /api/predictions/:matchKey` - Clear a prediction

### Results (Admin only)
- `GET /api/results` - Get all match results
- `POST /api/results` - Set/match result
- `PUT /api/results/:matchKey` - Update match result

### Leaderboard
- `GET /api/leaderboard` - Get rankings with points

### Groups (Reference data)
- `GET /api/groups` - Get group stage teams and structure
- `GET /api/knockout` - Get knockout bracket structure

## UI/UX Specification

### Pages

1. **Login Page** (`/login`)
   - Logo and title
   - Username input
   - Password input
   - Login button
   - "Register" link
   - Error message display

2. **Register Page** (`/register`)
   - Username input
   - Email input
   - Password input
   - Confirm password
   - Register button
   - "Login" link

3. **Main Game Page** (`/game`)
   - Player selector chip bar (like original)
   - Groups grid with standings
   - Knockout bracket view
   - Leaderboard view

4. **Leaderboard Page** (`/leaderboard`)
   - Full rankings table
   - Points breakdown

5. **Profile/Settings** (`/profile`)
   - Change password
   - Logout button

### Components

- `PlayerChip` - Selectable player name chip
- `GroupCard` - Group with standings table and match inputs
- `MatchRow` - Team names with score inputs
- `StandingsTable` - Team rankings
- `KnockoutBracket` - Visual bracket display
- `ScoreInput` - Number input for goals

### Theme/Colors (from original)
- `--green: #0a5c36`
- `--green-mid: #1a7a4a`
- `--gold: #c9a84c`
- `--red: #c0392b`
- `--bg: #f4f1eb`

## Security

- Passwords hashed with bcrypt
- JWT tokens for authentication
- Session-based auth (HttpOnly cookies alternative)
- Admin role checks for result entry
- Input validation on all API endpoints

## Docker Configuration

### Services
- `app` - Node.js API server (port 3001)
- `client` - Vite dev server (port 5173)
- `sqlserver` - MSSQL Server (port 1433)

### docker-compose.yml
- Network configuration
- Volume for database persistence
- Environment variables for connection strings

## Acceptance Criteria

1. ✅ Users can register and login with unique accounts
2. ✅ Multiple users can access the app from different devices
3. ✅ Each user can enter their own predictions
4. ✅ Admin can enter actual match results
5. ✅ Points calculated automatically (5 pts exact, 2 pts outcome)
6. ✅ Leaderboard shows all players ranked by points
7. ✅ Data persists in MSSQL database
8. ✅ Application runs in Docker container