## create admin

```curl
curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"username":"admin","password":"geheimer"}'
```

## get token

```curl
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"geheimer"}'
```

## seed

```curl
curl -X POST http://localhost:3001/api/admin/seed -H "Authorization: Bearer <the retrieved token here>"
```

## admin: get all users (admin only)

```curl
curl -X GET http://localhost:3001/api/admin/users -H "Authorization: Bearer <admin token>"
```

## admin: reset user password (admin only)

```curl
curl -X POST http://localhost:3001/api/admin/reset-password -H "Authorization: Bearer <admin token>" -H "Content-Type: application/json" -d '{"userId":2,"newPassword":"newpassword123"}'
```

## Tournament Simulation

The simulation feature allows you to populate the database with test data by creating simulated players, random predictions, and match results. This is useful for testing the UI and leaderboard functionality without waiting for real World Cup matches.

### Run Full Simulation (6 players with random guesses)

```curl
curl -X POST http://localhost:3001/api/admin/simulate -H "Authorization: Bearer <admin token>"
```

With custom player count:

```curl
curl -X POST http://localhost:3001/api/admin/simulate -H "Authorization: Bearer <admin token>" -H "Content-Type: application/json" -d '{"playerCount":6}'
```

This will:

- Create 6 players (player1, player2, ..., player6) with password "test123"
- Make random predictions for all 104 World Cup matches for each player
- Generate random match results for all matches
- Populate the database so results can be viewed in the UI

Response example:

```json
{
  "success": true,
  "message": "Simulation completed with 6 players",
  "data": {
    "playerCount": 6,
    "players": [
      { "userId": 2, "username": "player1" },
      { "userId": 3, "username": "player2" }
    ],
    "predictionsMade": 624,
    "resultsGenerated": 104,
    "matchKeys": 104
  }
}
```

### Check Simulation Status

```curl
curl -X GET http://localhost:3001/api/admin/simulate/status -H "Authorization: Bearer <admin token>"
```

### Cleanup Simulation Data

```curl
curl -X POST http://localhost:3001/api/admin/cleanup-simulation -H "Authorization: Bearer <admin token>"
```

This will remove:

- All simulated players (player1, player2, etc.)
- All predictions made by simulated players
- All match results

Response example:

```json
{
  "success": true,
  "message": "Simulation data cleaned up",
  "data": {
    "usersDeleted": 6,
    "predictionsDeleted": 624,
    "resultsDeleted": 104
  }
}
```

### Complete Test Workflow

1. Create admin user (if not already done):

```curl
curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"username":"admin","password":"geheimer"}'
```

2. Login to get token:

```curl
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"geheimer"}'
```

3. Seed the database:

```curl
curl -X POST http://localhost:3001/api/admin/seed -H "Authorization: Bearer <token>"
```

4. Run simulation:

```curl
curl -X POST http://localhost:3001/api/admin/simulate -H "Authorization: Bearer <token>"
```

5. View leaderboard with results:

```curl
curl -X GET http://localhost:3001/api/leaderboard
```

6. View results:

```curl
curl -X GET http://localhost:3001/api/results
```

7. Cleanup when done:

```curl
curl -X POST http://localhost:3001/api/admin/cleanup-simulation -H "Authorization: Bearer <token>"
```
