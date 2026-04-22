import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getDb, initDatabase, sql } from './db.js';
import { resultScheduler } from './services/scheduler.js';
import { seedDatabase } from './services/seed.js';
import type { Request, Response } from 'express';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Auth middleware
async function authMiddleware(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Admin middleware
function adminMiddleware(req: Request, res: Response, next: Function) {
  if (!(req as any).user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ==================== AUTH ====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const db = await getDb();
    let request = db.request();
    request.input('username', sql.VarChar, username);
    const existing = await request.query('SELECT Id FROM tipp_Users WHERE Username = @username');

    if (existing.recordset.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isFirstUser = (await db.query('SELECT COUNT(*) as cnt FROM tipp_Users')).recordset[0].cnt === 0;

    request = db.request();
    request.input('username', sql.VarChar, username);
    request.input('passwordHash', sql.VarChar, passwordHash);
    request.input('email', sql.VarChar, email || '');
    request.input('isAdmin', sql.Int, isFirstUser ? 1 : 0);
    const result = await request.query(
      'INSERT INTO tipp_Users (Username, PasswordHash, Email, IsAdmin) OUTPUT INSERTED.Id VALUES (@username, @passwordHash, @email, @isAdmin)'
    );

    const userId = result.recordset[0].Id;
    const token = jwt.sign(
      { userId, username, isAdmin: isFirstUser },
      JWT_SECRET as any,
      { expiresIn: JWT_EXPIRES_IN } as any
    );

    res.json({ token, user: { id: userId, username, isAdmin: isFirstUser } });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const db = await getDb();
    const request = db.request();
    request.input('username', sql.VarChar, username);
    const result = await request.query('SELECT * FROM tipp_Users WHERE Username = @username');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.Id, username: user.Username, isAdmin: user.IsAdmin },
      JWT_SECRET as any,
      { expiresIn: JWT_EXPIRES_IN } as any
    );

    res.json({ token, user: { id: user.Id, username: user.Username, isAdmin: user.IsAdmin } });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const request = db.request();
    request.input('id', sql.Int, (req as any).user.userId);
    const result = await request.query('SELECT Id, Username, Email, IsAdmin, CreatedAt FROM tipp_Users WHERE Id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = result.recordset[0];
    res.json({ user: { id: u.Id, username: u.Username, email: u.Email, isAdmin: !!u.IsAdmin, createdAt: u.CreatedAt } });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ==================== PREDICTIONS ====================

app.get('/api/predictions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const request = db.request();
    request.input('userId', sql.Int, (req as any).user.userId);
    const result = await request.query(
      'SELECT MatchKey, HomeScore, AwayScore FROM tipp_Predictions WHERE UserId = @userId'
    );

    const predictions: Record<string, { homeScore: number; awayScore: number }> = {};
    result.recordset.forEach((row: any) => {
      predictions[row.MatchKey] = { homeScore: row.HomeScore, awayScore: row.AwayScore };
    });

    res.json(predictions);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get predictions' });
  }
});

app.post('/api/predictions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { matchKey, homeScore, awayScore } = req.body;
    if (!matchKey) {
      return res.status(400).json({ error: 'MatchKey required' });
    }

    const db = await getDb();
    const userId = (req as any).user.userId;

    const request = db.request();
    request.input('userId', sql.Int, userId);
    request.input('matchKey', sql.VarChar, matchKey);
    request.input('homeScore', sql.Int, homeScore === '' ? null : homeScore);
    request.input('awayScore', sql.Int, awayScore === '' ? null : awayScore);
    await request.query(
      `MERGE INTO tipp_Predictions AS target
       USING (SELECT @userId AS UserId, @matchKey AS MatchKey) AS source
       ON target.UserId = source.UserId AND target.MatchKey = source.MatchKey
       WHEN MATCHED THEN
         UPDATE SET HomeScore = @homeScore, AwayScore = @awayScore, UpdatedAt = GETDATE()
       WHEN NOT MATCHED THEN
         INSERT (UserId, MatchKey, HomeScore, AwayScore) VALUES (@userId, @matchKey, @homeScore, @awayScore);`
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save prediction' });
  }
});

app.delete('/api/predictions/:matchKey', authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const request = db.request();
    request.input('userId', sql.Int, (req as any).user.userId);
    request.input('matchKey', sql.VarChar, req.params.matchKey);
    await request.query('DELETE FROM tipp_Predictions WHERE UserId = @userId AND MatchKey = @matchKey');

    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete prediction' });
  }
});

// ==================== RESULTS ====================

app.get('/api/results', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT MatchKey, HomeScore, AwayScore, IsKnockout, RoundName FROM tipp_MatchResults');

    const results: Record<string, any> = {};
    result.recordset.forEach((row: any) => {
      results[row.MatchKey] = {
        homeScore: row.HomeScore,
        awayScore: row.AwayScore,
        isKnockout: row.IsKnockout,
        roundName: row.RoundName,
      };
    });

    res.json(results);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

app.post('/api/results', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  res.status(410).json({ 
    error: 'Manual result entry is disabled. Results are automatically fetched from WC2026 API.', 
    status: 'automatic_fetching_enabled' 
  });
});

// GET /api/results/status - Check automatic fetch status (admin only)
app.get('/api/results/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    
    // Get last fetched timestamp from database (max UpdatedAt where LastFetchedAt is set)
    const lastFetchResult = await db.query(`
      SELECT MAX(LastFetchedAt) as lastFetched 
      FROM tipp_MatchResults 
      WHERE LastFetchedAt IS NOT NULL
    `);
    
    const lastFetched = lastFetchResult.recordset[0]?.lastFetched;
    
    // Count matches with scores
    const countResult = await db.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN HomeScore IS NOT NULL AND AwayScore IS NOT NULL THEN 1 ELSE 0 END) as withScores
      FROM tipp_MatchResults
    `);
    
    const schedulerStatus = resultScheduler.getStatus();
    
    res.json({
      automaticFetching: true,
      lastFetched: lastFetched,
      scheduler: {
        isRunning: schedulerStatus.isRunning,
        lastRun: schedulerStatus.lastRun,
        lastError: schedulerStatus.lastError,
      },
      database: countResult.recordset[0],
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// ==================== LEADERBOARD ====================

app.get('/api/leaderboard', async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    const resultsResult = await db.query('SELECT MatchKey, HomeScore, AwayScore FROM tipp_MatchResults WHERE HomeScore IS NOT NULL AND AwayScore IS NOT NULL');
    const results: Record<string, { h: number; a: number }> = {};
    resultsResult.recordset.forEach((row: any) => {
      results[row.MatchKey] = { h: row.HomeScore, a: row.AwayScore };
    });

    const predictionsResult = await db.query('SELECT UserId, MatchKey, HomeScore, AwayScore FROM tipp_Predictions');
    const userPredictions: Record<number, Record<string, { h: number; a: number }>> = {};
    predictionsResult.recordset.forEach((row: any) => {
      if (!userPredictions[row.UserId]) userPredictions[row.UserId] = {};
      if (row.HomeScore !== null && row.AwayScore !== null) {
        userPredictions[row.UserId][row.MatchKey] = { h: row.HomeScore, a: row.AwayScore };
      }
    });

    const usersResult = await db.query('SELECT Id, Username FROM tipp_Users');
    const users: Record<number, string> = {};
    usersResult.recordset.forEach((row: any) => {
      users[row.Id] = row.Username;
    });

    const leaderboard = usersResult.recordset.map((row: any) => {
      let exact = 0, outcome = 0, total = 0;
      const userPred = userPredictions[row.Id] || {};

      Object.entries(results).forEach(([key, r]) => {
        const p = userPred[key];
        if (!p) return;
        if (r.h === p.h && r.a === p.a) {
          exact++;
          total += 5;
        } else {
          const rOut = r.h > r.a ? 1 : r.h < r.a ? -1 : 0;
          const pOut = p.h > p.a ? 1 : p.h < p.a ? -1 : 0;
          if (rOut === pOut) {
            outcome++;
            total += 2;
          }
        }
      });

      return { userId: row.Id, username: users[row.Id], exact, outcome, total };
    });

    leaderboard.sort((a: any, b: any) => b.total - a.total);
    res.json(leaderboard);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// ==================== GROUPS DATA ====================

app.get('/api/groups', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const checkTable = await db.query(`SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'tipp_Teams'`);
    if (checkTable.recordset[0].cnt === 0) {
      return res.json({});
    }
    
    const groupsResult = await db.query(`SELECT DISTINCT GroupName FROM tipp_Teams WHERE GroupName IS NOT NULL ORDER BY GroupName`);

    const GROUPS: Record<string, { teams: string[]; matches: number[][] }> = {};

    for (const row of groupsResult.recordset) {
      const groupName = row.GroupName;
      
      const teamsReq = db.request();
      teamsReq.input('group', sql.VarChar, groupName);
      const teamsResult = await teamsReq.query('SELECT Name FROM tipp_Teams WHERE GroupName = @group ORDER BY Id');
      const teamNames = teamsResult.recordset.map((r: any) => r.Name);

      const matchesReq = db.request();
      matchesReq.input('group', sql.VarChar, groupName);
      const matchesResult = await matchesReq.query(
        `SELECT DISTINCT MatchOrder FROM tipp_Matches 
         WHERE GroupName = @group AND MatchType = 'group'
         ORDER BY MatchOrder`
      );
      const matchOrders = matchesResult.recordset.map((r: any) => r.MatchOrder);

      const matchPairs: Record<number, number[]> = {
        0: [0, 1], 1: [2, 3], 2: [0, 2], 3: [1, 3], 4: [0, 3], 5: [1, 2]
      };

       const uniquePairs = [...new Set(matchOrders.map((o: number) => JSON.stringify(matchPairs[o])))].map((item: string) => JSON.parse(item));
      GROUPS[groupName] = { teams: teamNames, matches: uniquePairs };
    }

    res.json(GROUPS);
  } catch (err: any) {
    console.error('Groups error:', err);
    res.status(500).json({ error: 'Failed to get groups' });
  }
});

app.get('/api/flags', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const checkTable = await db.query(`SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'tipp_Teams'`);
    if (checkTable.recordset[0].cnt === 0) {
      return res.json({ 'TBD': '❓' });
    }
    
    const result = await db.query('SELECT Name, Code FROM tipp_Teams');
    
    const FLAG_EMOJI_MAP: Record<string, string> = {
      'MEX': '🇲🇽', 'RSA': '🇿🇦', 'KOR': '🇰🇷', 'CZE': '🇨🇿',
      'CAN': '🇨🇦', 'BIH': '🇧🇦', 'QAT': '🇶🇦', 'SUI': '🇨🇭',
      'BRA': '🇧🇷', 'MAR': '🇲🇦', 'HAI': '🇭🇹', 'SCO': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'USA': '🇺🇸', 'PAR': '🇵🇾', 'AUS': '🇦🇺', 'TUR': '🇹🇷',
      'GER': '🇩🇪', 'CUR': '🇨🇼', 'CIV': '🇨🇮', 'ECU': '🇪🇨',
      'NED': '🇳🇱', 'JPN': '🇯🇵', 'SWE': '🇸🇪', 'TUN': '🇹🇳',
      'BEL': '🇧🇪', 'EGY': '🇪🇬', 'IRN': '🇮🇷', 'NZL': '🇳🇿',
      'ESP': '🇪🇸', 'CPV': '🇨🇻', 'KSA': '🇸🇦', 'URU': '🇺🇾',
      'FRA': '🇫🇷', 'SEN': '🇸🇳', 'IRQ': '🇮🇶', 'NOR': '🇳🇴',
      'ARG': '🇦🇷', 'ALG': '🇩🇿', 'AUT': '🇦🇹', 'JOR': '🇯🇴',
      'POR': '🇵🇹', 'COD': '🇨🇩', 'UZB': '🇺🇿', 'COL': '🇨🇴',
      'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'CRO': '🇭🇷', 'GHA': '🇬🇭', 'PAN': '🇵🇦',
      'TBD': '❓'
    };

    const FLAGS: Record<string, string> = {};
    result.recordset.forEach((row: any) => {
      FLAGS[row.Name] = FLAG_EMOJI_MAP[row.Code] || '❓';
    });
    FLAGS['TBD'] = '❓';
    res.json(FLAGS);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get flags' });
  }
});

app.get('/api/knockout', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const checkTable = await db.query(`SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'tipp_Matches'`);
    if (checkTable.recordset[0].cnt === 0) {
      return res.json([]);
    }
    
    const result = await db.query(`
      SELECT DISTINCT RoundName,
        CASE RoundName 
          WHEN 'Round of 32' THEN 1 
          WHEN 'Round of 16' THEN 2 
          WHEN 'Quarter-finals' THEN 3 
          WHEN 'Semi-finals' THEN 4 
          WHEN '3rd Place' THEN 5 
          WHEN 'Final' THEN 6 
        END AS OrderIdx
      FROM tipp_Matches WHERE MatchType = 'knockout' AND RoundName IS NOT NULL ORDER BY OrderIdx
    `);
    
    const rounds = result.recordset.map((row: any) => {
      const name = row.RoundName;
      let matches = 1;
      if (name === 'Round of 32') matches = 16;
      else if (name === 'Round of 16') matches = 8;
      else if (name === 'Quarter-finals') matches = 4;
      else if (name === 'Semi-finals') matches = 2;
      
      let id = 'f';
      if (name === 'Round of 32') id = 'r32';
      else if (name === 'Round of 16') id = 'r16';
      else if (name === 'Quarter-finals') id = 'qf';
      else if (name === 'Semi-finals') id = 'sf';
      else if (name === '3rd Place') id = '3rd';
      
      return { id, name, matches };
    });
    
    res.json(rounds);
  } catch (err: any) {
    console.error('Knockout error:', err);
    res.status(500).json({ error: 'Failed to get knockout rounds' });
  }
});

// ==================== USER MANAGEMENT ====================

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT Id, Username, Email, IsAdmin, CreatedAt FROM tipp_Users ORDER BY Id');
    const users = result.recordset.map((u: any) => ({
      id: u.Id,
      username: u.Username,
      email: u.Email,
      isAdmin: !!u.IsAdmin,
      createdAt: u.CreatedAt,
    }));
    res.json(users);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

app.post('/api/admin/reset-password', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'User ID and new password required' });
    }

    const db = await getDb();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    const request = db.request();
    request.input('userId', sql.Int, userId);
    request.input('passwordHash', sql.VarChar, passwordHash);
    const result = await request.query('UPDATE tipp_Users SET PasswordHash = @passwordHash WHERE Id = @userId');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ==================== SEED DATA ====================

app.post('/api/admin/seed', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    await seedDatabase();
    res.json({ success: true, message: 'Seed data populated (or already existed)' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to seed data' });
  }
});

// ==================== START ====================

async function start() {
  try {
    await initDatabase();
    
    // Seed teams and matches automatically if not already present
    await seedDatabase();
    
    // Start the automatic result fetching scheduler
    resultScheduler.start();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();