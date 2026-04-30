import express, { NextFunction } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { getDb, initDatabase, sql } from "./db.js";
import { resultScheduler } from "./services/scheduler.js";
import { seedDatabase } from "./services/seed.js";
import { simulator } from "./services/simulation.js";
import { generatePdf } from "./services/pdfExport.js";
import { TEAM_CODES } from "./data/teamCodes.js";
import { validate } from "./validation/validate.js";
import { registerSchema, loginSchema, predictionSchema, resetPasswordSchema, simulationSchema, type RegisterInput, type LoginInput, type PredictionInput, type ResetPasswordInput, type SimulationInput } from "./validation/schemas.js";
import type { Request, Response } from "express";
import type { ValidatedRequest } from "./validation/validate.js";

dotenv.config();

interface UserInfo {
  userId: number;
  username: string;
  isAdmin: boolean;
}

type AuthRequest = Request & { user?: UserInfo };

interface IdRow {
  Id: number;
}
interface CountRow {
  cnt: number;
}
interface UserAuthRow {
  Id: number;
  Username: string;
  PasswordHash: string;
  IsAdmin: boolean;
}
interface UserRecord {
  Id: number;
  Username: string;
  IsAdmin: boolean;
  CreatedAt: Date;
}
interface SimpleUserRecord {
  Id: number;
  Username: string;
}
interface PredictionRow {
  MatchKey: string;
  HomeScore: number | null;
  AwayScore: number | null;
  UserId: number;
}

interface MatchResultRecord {
  MatchKey: string;
  HomeScore: number | null;
  AwayScore: number | null;
  IsKnockout: boolean;
  RoundName: string | null;
}
interface SimpleMatchResult {
  MatchKey: string;
  HomeScore: number;
  AwayScore: number;
}

interface TeamNameCodeRow {
  Name: string;
  Code: string;
}
interface GroupNameRow {
  GroupName: string;
}

interface KnockoutRoundRow {
  RoundName: string;
  OrderIdx: number;
}
interface LastFetchRecord {
  lastFetched: Date | null;
}
interface CountResultRecord {
  total: number;
  withScores: number;
}
interface ResultInfo {
  homeScore: number | null;
  awayScore: number | null;
  isKnockout: boolean;
  roundName: string | null;
}

interface LeaderboardEntry {
  userId: number;
  username: string;
  exact: number;
  outcome: number;
  total: number;
  predictionCount: number;
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "default-secret";
const JWT_EXPIRES_IN = 604800; // 7 days in seconds

// Auth middleware
async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserInfo;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Admin middleware
function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// ==================== AUTH ====================

app.post(
  "/api/auth/register",
  validate(registerSchema),
  async (req: ValidatedRequest< RegisterInput>, res: Response) => {
    try {
      const { username, password } = req.validated!;

    const db = await getDb();
    let request = db.request();
    request.input("username", sql.VarChar, username);
    const existing = await request.query<IdRow>(
      "SELECT Id FROM tipp_Users WHERE Username = @username",
    );

    if (existing.recordset.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isFirstUser =
      (await db.query<CountRow>("SELECT COUNT(*) as cnt FROM tipp_Users"))
        .recordset[0].cnt === 0;

    request = db.request();
    request.input("username", sql.VarChar, username);
    request.input("passwordHash", sql.VarChar, passwordHash);
    request.input("isAdmin", sql.Int, isFirstUser ? 1 : 0);
    const result = await request.query<IdRow>(
      "INSERT INTO tipp_Users (Username, PasswordHash, IsAdmin) OUTPUT INSERTED.Id VALUES (@username, @passwordHash, @isAdmin)",
    );

    const userId = result.recordset[0].Id;
    const secret: jwt.Secret = JWT_SECRET;
    const token = jwt.sign({ userId, username, isAdmin: isFirstUser }, secret, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.json({ token, user: { id: userId, username, isAdmin: isFirstUser } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post(
  "/api/auth/login",
  validate(loginSchema),
  async (req: ValidatedRequest<LoginInput>, res: Response) => {
    try {
      const { username, password } = req.validated!;

    const db = await getDb();
    const request = db.request();
    request.input("username", sql.VarChar, username);
    const result = await request.query<UserAuthRow>(
      "SELECT * FROM tipp_Users WHERE Username = @username",
    );

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.recordset[0];
    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const secret: jwt.Secret = JWT_SECRET;
    const token = jwt.sign(
      { userId: user.Id, username: user.Username, isAdmin: user.IsAdmin },
      secret,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.json({
      token,
      user: { id: user.Id, username: user.Username, isAdmin: user.IsAdmin },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get(
  "/api/auth/me",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const db = await getDb();
      const request = db.request();
      request.input("id", sql.Int, req.user!.userId);
      const result = await request.query(
        "SELECT Id, Username, IsAdmin, CreatedAt FROM tipp_Users WHERE Id = @id",
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const u = result.recordset[0];
      res.json({
        user: {
          id: u.Id,
          username: u.Username,
          isAdmin: !!u.IsAdmin,
          createdAt: u.CreatedAt,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get user" });
    }
  },
);

// ==================== PREDICTIONS ====================

app.get(
  "/api/predictions",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const db = await getDb();
      const request = db.request();
      request.input("userId", sql.Int, req.user!.userId);
      const result = await request.query<PredictionRow>(
        "SELECT MatchKey, HomeScore, AwayScore FROM tipp_Predictions WHERE UserId = @userId",
      );

      const predictions: Record<
        string,
        { homeScore: number | null; awayScore: number | null }
      > = {};
      result.recordset.forEach((row) => {
        predictions[row.MatchKey] = {
          homeScore: row.HomeScore,
          awayScore: row.AwayScore,
        };
      });

      res.json(predictions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get predictions" });
    }
  },
);

app.post(
  "/api/predictions",
  authMiddleware,
  validate(predictionSchema),
  async (req: ValidatedRequest<PredictionInput> & AuthRequest, res: Response) => {
    try {
      const { matchKey, homeScore, awayScore } = req.validated!;

      const db = await getDb();
      const userId = req.user!.userId;

      const request = db.request();
      request.input("userId", sql.Int, userId);
      request.input("matchKey", sql.VarChar, matchKey);
      request.input("homeScore", sql.Int, homeScore ?? null);
      request.input("awayScore", sql.Int, awayScore ?? null);
      await request.query(
        `MERGE INTO tipp_Predictions AS target
       USING (SELECT @userId AS UserId, @matchKey AS MatchKey) AS source
       ON target.UserId = source.UserId AND target.MatchKey = source.MatchKey
       WHEN MATCHED THEN
         UPDATE SET HomeScore = @homeScore, AwayScore = @awayScore, UpdatedAt = GETDATE()
       WHEN NOT MATCHED THEN
         INSERT (UserId, MatchKey, HomeScore, AwayScore) VALUES (@userId, @matchKey, @homeScore, @awayScore);`,
      );

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save prediction" });
    }
  },
);

app.delete(
  "/api/predictions/:matchKey",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const db = await getDb();
      const request = db.request();
      request.input("userId", sql.Int, req.user!.userId);
      request.input("matchKey", sql.VarChar, req.params.matchKey);
      await request.query(
        "DELETE FROM tipp_Predictions WHERE UserId = @userId AND MatchKey = @matchKey",
      );

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete prediction" });
    }
  },
);

// ==================== RESULTS ====================

app.get("/api/results", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = await db.query<MatchResultRecord>(
      "SELECT MatchKey, HomeScore, AwayScore, IsKnockout, RoundName FROM tipp_MatchResults",
    );

    const results: Record<string, ResultInfo> = {};
    result.recordset.forEach((row) => {
      results[row.MatchKey] = {
        homeScore: row.HomeScore,
        awayScore: row.AwayScore,
        isKnockout: row.IsKnockout,
        roundName: row.RoundName,
      };
    });

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get results" });
  }
});

app.post(
  "/api/results",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    res.status(410).json({
      error:
        "Manual result entry is disabled. Results are automatically fetched from WC2026 API.",
      status: "automatic_fetching_enabled",
    });
  },
);

// GET /api/results/status - Check automatic fetch status (admin only)
app.get(
  "/api/results/status",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const db = await getDb();

      // Get last fetched timestamp from database (max UpdatedAt where LastFetchedAt is set)
      const lastFetchResult = await db.query<LastFetchRecord>(`
        SELECT MAX(LastFetchedAt) as lastFetched 
        FROM tipp_MatchResults 
        WHERE LastFetchedAt IS NOT NULL
      `);

      const lastFetched = lastFetchResult.recordset[0]?.lastFetched;

      // Count matches with scores
      const countResult = await db.query<CountResultRecord>(`
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
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get status" });
    }
  },
);

// ==================== LEADERBOARD ====================

app.get("/api/leaderboard", async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    const resultsResult = await db.query<SimpleMatchResult>(
      "SELECT MatchKey, HomeScore, AwayScore FROM tipp_MatchResults WHERE HomeScore IS NOT NULL AND AwayScore IS NOT NULL",
    );
    const results: Record<string, { h: number; a: number }> = {};
    resultsResult.recordset.forEach((row) => {
      results[row.MatchKey] = { h: row.HomeScore, a: row.AwayScore };
    });

    const predictionsResult = await db.query<PredictionRow>(
      "SELECT UserId, MatchKey, HomeScore, AwayScore FROM tipp_Predictions",
    );
    const userPredictions: Record<
      number,
      Record<string, { h: number; a: number }>
    > = {};
    predictionsResult.recordset.forEach((row) => {
      if (!userPredictions[row.UserId]) userPredictions[row.UserId] = {};
      if (row.HomeScore !== null && row.AwayScore !== null) {
        userPredictions[row.UserId][row.MatchKey] = {
          h: row.HomeScore,
          a: row.AwayScore,
        };
      }
    });

    const usersResult = await db.query<SimpleUserRecord>(
      "SELECT Id, Username FROM tipp_Users",
    );
    const users: Record<number, string> = {};
    usersResult.recordset.forEach((row) => {
      users[row.Id] = row.Username;
    });

    // Count predictions per user
    const predictionCountMap: Record<number, number> = {};
    predictionsResult.recordset.forEach((row) => {
      predictionCountMap[row.UserId] =
        (predictionCountMap[row.UserId] || 0) + 1;
    });

    const leaderboard: LeaderboardEntry[] = usersResult.recordset.map((row) => {
      let exact = 0,
        outcome = 0,
        total = 0;
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

      return {
        userId: row.Id,
        username: users[row.Id],
        exact,
        outcome,
        total,
        predictionCount: predictionCountMap[row.Id] || 0,
      };
    });

    leaderboard.sort((a, b) => b.total - a.total);
    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
});

// ==================== GROUPS DATA ====================

app.get("/api/groups", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const checkTable = await db.query<CountRow>(
      `SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'tipp_Teams'`,
    );
    if (checkTable.recordset[0].cnt === 0) {
      return res.json({});
    }

    const groupsResult = await db.query<GroupNameRow>(
      `SELECT DISTINCT GroupName FROM tipp_Teams WHERE GroupName IS NOT NULL ORDER BY GroupName`,
    );

    const GROUPS: Record<string, { teams: string[]; matches: number[][] }> = {};

    for (const row of groupsResult.recordset) {
      const groupName = row.GroupName;

      const teamsReq = db.request();
      teamsReq.input("group", sql.VarChar, groupName);
      const teamsResult = await teamsReq.query<{ Name: string }>(
        "SELECT Name FROM tipp_Teams WHERE GroupName = @group ORDER BY Id",
      );
      const teamNames = teamsResult.recordset.map((r) => r.Name);

      const matchesReq = db.request();
      matchesReq.input("group", sql.VarChar, groupName);
      const matchesResult = await matchesReq.query<{ MatchOrder: number }>(
        `SELECT DISTINCT MatchOrder FROM tipp_Matches 
         WHERE GroupName = @group AND MatchType = 'group'
         ORDER BY MatchOrder`,
      );
      const matchOrders = matchesResult.recordset.map((r) => r.MatchOrder);

      const matchPairs: Record<number, number[]> = {
        0: [0, 1],
        1: [2, 3],
        2: [0, 2],
        3: [1, 3],
        4: [0, 3],
        5: [1, 2],
      };

      const uniquePairs = [
        ...new Set(
          matchOrders.map((o: number) => JSON.stringify(matchPairs[o])),
        ),
      ].map((item: string) => JSON.parse(item));
      GROUPS[groupName] = { teams: teamNames, matches: uniquePairs };
    }

    res.json(GROUPS);
  } catch (err) {
    console.error("Groups error:", err);
    res.status(500).json({ error: "Failed to get groups" });
  }
});

app.get("/api/flags", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const checkTable = await db.query<CountRow>(
      `SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'tipp_Teams'`,
    );
    if (checkTable.recordset[0].cnt === 0) {
      return res.json({ TBD: "❓" });
    }

    const result = await db.query<TeamNameCodeRow>(
      "SELECT Name, Code FROM tipp_Teams",
    );

    const FLAG_EMOJI_MAP: Record<string, string> = {
      MEX: "🇲🇽",
      RSA: "🇿🇦",
      KOR: "🇰🇷",
      CZE: "🇨🇿",
      CAN: "🇨🇦",
      BIH: "🇧🇦",
      QAT: "🇶🇦",
      SUI: "🇨🇭",
      BRA: "🇧🇷",
      MAR: "🇲🇦",
      HAI: "🇭🇹",
      SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
      USA: "🇺🇸",
      PAR: "🇵🇾",
      AUS: "🇦🇺",
      TUR: "🇹🇷",
      GER: "🇩🇪",
      CUR: "🇨🇼",
      CIV: "🇨🇮",
      ECU: "🇪🇨",
      NED: "🇳🇱",
      JPN: "🇯🇵",
      SWE: "🇸🇪",
      TUN: "🇹🇳",
      BEL: "🇧🇪",
      EGY: "🇪🇬",
      IRN: "🇮🇷",
      NZL: "🇳🇿",
      ESP: "🇪🇸",
      CPV: "🇨🇻",
      KSA: "🇸🇦",
      URU: "🇺🇾",
      FRA: "🇫🇷",
      SEN: "🇸🇳",
      IRQ: "🇮🇶",
      NOR: "🇳🇴",
      ARG: "🇦🇷",
      ALG: "🇩🇿",
      AUT: "🇦🇹",
      JOR: "🇯🇴",
      POR: "🇵🇹",
      COD: "🇨🇩",
      UZB: "🇺🇿",
      COL: "🇨🇴",
      ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      CRO: "🇭🇷",
      GHA: "🇬🇭",
      PAN: "🇵🇦",
      TBD: "❓",
    };

    const FLAGS: Record<string, string> = {};
    result.recordset.forEach((row) => {
      FLAGS[row.Name] = FLAG_EMOJI_MAP[row.Code] || "❓";
    });
    FLAGS["TBD"] = "❓";
    res.json(FLAGS);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get flags" });
  }
});

app.get("/api/knockout", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const checkTable = await db.query<CountRow>(
      `SELECT COUNT(*) as cnt FROM sys.tables WHERE name = 'tipp_Matches'`,
    );
    if (checkTable.recordset[0].cnt === 0) {
      return res.json([]);
    }

    const result = await db.query<KnockoutRoundRow>(`
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

    const rounds = result.recordset.map((row) => {
      const name = row.RoundName;
      let matches = 1;
      if (name === "Round of 32") matches = 16;
      else if (name === "Round of 16") matches = 8;
      else if (name === "Quarter-finals") matches = 4;
      else if (name === "Semi-finals") matches = 2;

      let id = "f";
      if (name === "Round of 32") id = "r32";
      else if (name === "Round of 16") id = "r16";
      else if (name === "Quarter-finals") id = "qf";
      else if (name === "Semi-finals") id = "sf";
      else if (name === "3rd Place") id = "3rd";

      return { id, name, matches };
    });

    res.json(rounds);
  } catch (err) {
    console.error("Knockout error:", err);
    res.status(500).json({ error: "Failed to get knockout rounds" });
   }
 });

 // ==================== TEAM CODES ====================

 app.get('/api/team-codes', async (req: Request, res: Response) => {
   res.json(TEAM_CODES);
 });

 // ==================== PDF EXPORT ====================

 app.get('/api/export-pdf', authMiddleware, async (req: AuthRequest, res: Response) => {
   try {
     const db = await getDb();
     
     // ---------- Build groups ----------
     const groupsResult = await db.query<GroupNameRow>(
       `SELECT DISTINCT GroupName FROM tipp_Teams WHERE GroupName IS NOT NULL ORDER BY GroupName`,
     );

     const GROUPS: Record<string, { teams: string[]; matches: number[][] }> = {};

     for (const row of groupsResult.recordset) {
       const groupName = row.GroupName;

       const teamsReq = db.request();
       teamsReq.input('group', sql.VarChar, groupName);
       const teamsResult = await teamsReq.query<{ Name: string }>(
         'SELECT Name FROM tipp_Teams WHERE GroupName = @group ORDER BY Id',
       );
       const teamNames = teamsResult.recordset.map(r => r.Name);

       const matchesReq = db.request();
       matchesReq.input('group', sql.VarChar, groupName);
       const matchesResult = await matchesReq.query<{ MatchOrder: number }>(
         `SELECT DISTINCT MatchOrder FROM tipp_Matches 
          WHERE GroupName = @group AND MatchType = 'group'
          ORDER BY MatchOrder`,
       );
       const matchOrders = matchesResult.recordset.map(r => r.MatchOrder);

       const matchPairs: Record<number, number[]> = {
         0: [0, 1],
         1: [2, 3],
         2: [0, 2],
         3: [1, 3],
         4: [0, 3],
         5: [1, 2],
       };

       const uniquePairs = [
         ...new Set(
           matchOrders.map(o => JSON.stringify(matchPairs[o])),
         ),
       ].map(item => JSON.parse(item));
       GROUPS[groupName] = { teams: teamNames, matches: uniquePairs };
     }

     // ---------- Build knockout ----------
     const knockoutResult = await db.query<KnockoutRoundRow>(`
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

     const knockout = knockoutResult.recordset.map((row) => {
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

     // ---------- Build scores (predictions or results) ----------
     const scoresMap: Record<string, { homeScore: number | null; awayScore: number | null }> = {};

     if (req.user!.isAdmin) {
       const resultsResult = await db.query<MatchResultRecord>(
         'SELECT MatchKey, HomeScore, AwayScore FROM tipp_MatchResults',
       );
       resultsResult.recordset.forEach(row => {
         scoresMap[row.MatchKey] = {
           homeScore: row.HomeScore,
           awayScore: row.AwayScore,
         };
       });
      } else {
        const request = db.request();
        request.input('userId', sql.Int, req.user!.userId);
        const predictionsResult = await request.query<PredictionRow>(
          'SELECT MatchKey, HomeScore, AwayScore FROM tipp_Predictions WHERE UserId = @userId',
        );
        predictionsResult.recordset.forEach(row => {
          scoresMap[row.MatchKey] = {
            homeScore: row.HomeScore,
            awayScore: row.AwayScore,
          };
        });
      }

      // ---------- Generate PDF ----------
      const pdfBuffer = await generatePdf(GROUPS, knockout, scoresMap);

     res.setHeader('Content-Type', 'application/pdf');
     const dateStr = new Date().toISOString().split('T')[0];
     res.setHeader('Content-Disposition', `attachment; filename="worldcup2026_matches_${dateStr}.pdf"`);
     res.send(pdfBuffer);
   } catch (error) {
     console.error('PDF export error:', error);
     res.status(500).json({ error: 'Failed to generate PDF' });
   }
 });

 // ==================== USER MANAGEMENT ====================


app.get(
  "/api/admin/users",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const result = await db.query<UserRecord>(
        "SELECT Id, Username, IsAdmin, CreatedAt FROM tipp_Users ORDER BY Id",
      );
      const users = result.recordset.map((u) => ({
        id: u.Id,
        username: u.Username,
        isAdmin: !!u.IsAdmin,
        createdAt: u.CreatedAt,
      }));
      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get users" });
    }
  },
);

app.post(
  "/api/admin/reset-password",
  authMiddleware,
  adminMiddleware,
  validate(resetPasswordSchema),
  async (req: ValidatedRequest<ResetPasswordInput>, res: Response) => {
    try {
      const { userId, newPassword } = req.validated!;

      const db = await getDb();
      const passwordHash = await bcrypt.hash(newPassword, 10);

      const request = db.request();
      request.input("userId", sql.Int, userId);
      request.input("passwordHash", sql.VarChar, passwordHash);
      const result = await request.query(
        "UPDATE tipp_Users SET PasswordHash = @passwordHash WHERE Id = @userId",
      );

      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to reset password" });
    }
  },
);

// ==================== SEED DATA ====================

app.post(
  "/api/admin/seed",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      await seedDatabase();
      res.json({
        success: true,
        message: "Seed data populated (or already existed)",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to seed data" });
    }
  },
);

// ==================== SIMULATION ====================

app.post(
  "/api/admin/simulate",
  authMiddleware,
  adminMiddleware,
  validate(simulationSchema),
  async (req: ValidatedRequest<SimulationInput>, res: Response) => {
    try {
      const count = req.validated?.playerCount ?? 6;

      const result = await simulator.runFullSimulation(count);

      res.json({
        success: true,
        message: `Simulation completed with ${count} players`,
        data: {
          playerCount: count,
          players: result.players.map((p) => ({
            userId: p.userId,
            username: p.username,
          })),
          predictionsMade: result.predictionsMade,
          resultsGenerated: result.resultsGenerated,
          matchKeys: simulator.getMatchKeys().length,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to run simulation" });
    }
  },
);

app.post(
  "/api/admin/cleanup-simulation",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const result = await simulator.cleanupSimulationData();

      res.json({
        success: true,
        message: "Simulation data cleaned up",
        data: {
          usersDeleted: result.usersDeleted,
          predictionsDeleted: result.predictionsDeleted,
          resultsDeleted: result.resultsDeleted,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to cleanup simulation data" });
    }
  },
);

app.get(
  "/api/admin/simulate/status",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const db = await getDb();

      const usersResult = await db.query<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM tipp_Users WHERE Username LIKE 'player%'",
      );
      const predictionsResult = await db.query<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM tipp_Predictions",
      );
      const resultsResult = await db.query<{
        cnt: number;
        withScores: number;
      }>(`
        SELECT COUNT(*) as cnt, 
               SUM(CASE WHEN HomeScore IS NOT NULL AND AwayScore IS NOT NULL THEN 1 ELSE 0 END) as withScores
        FROM tipp_MatchResults
      `);

      res.json({
        simulatedPlayers: usersResult.recordset[0].cnt,
        totalPredictions: predictionsResult.recordset[0].cnt,
        matchResults: {
          total: resultsResult.recordset[0].cnt,
          withScores: resultsResult.recordset[0].withScores,
        },
        players: simulator
          .getPlayers()
          .map((p) => ({ userId: p.userId, username: p.username })),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get simulation status" });
    }
  },
);

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
    console.error("Failed to start:", err);
    process.exit(1);
  }
}

start();
