import bcrypt from "bcryptjs";
import { type Request, type Response } from "express";
import { getDb } from "../db.js";
import { simulator } from "../services/simulation.js";
import { seedDatabase } from "../services/seed.js";
import { wc2026 } from "../services/wc2026.js";
import { mapMatchKey } from "../services/match-key-mapper.js";
import type { UserRecord } from "../types/db.js";
import type {
  ResetPasswordInput,
  SimulationInput,
} from "../validation/schemas.js";
import { NotFoundError } from "../middleware/errorHandler.js";

export const resetPassword = async (
  req: Request<unknown, unknown, ResetPasswordInput>,
  res: Response,
) => {
  const { userId, newPassword } = req.body;

  const db = await getDb();
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const result = await db.query(
    "UPDATE tipp_Users SET PasswordHash = $1 WHERE Id = $2 RETURNING Id",
    [passwordHash, userId],
  );

  if (result.rowCount === 0) {
    throw new NotFoundError("User not found");
  }

  res.json({ success: true });
};

export const simulate = async (
  req: Request<unknown, unknown, SimulationInput>,
  res: Response,
) => {
  const count = req.body.playerCount ?? 6;

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
};

export const cleanupSimulation = async (_req: Request, res: Response) => {
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
};

export const getSimulationStatus = async (req: Request, res: Response) => {
  const db = await getDb();

  const usersResult = await db.query<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM tipp_Users WHERE Username LIKE 'player%'",
  );
  const predictionsResult = await db.query<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM tipp_Predictions",
  );
  const resultsResult = await db.query<{ cnt: number; withscores: number }>(`
    SELECT COUNT(*) as cnt,
           SUM(CASE WHEN HomeScore IS NOT NULL AND AwayScore IS NOT NULL THEN 1 ELSE 0 END) as withscores
    FROM tipp_MatchResults
  `);

  res.json({
    simulatedPlayers: usersResult.rows[0].cnt,
    totalPredictions: predictionsResult.rows[0].cnt,
    matchResults: {
      total: resultsResult.rows[0].cnt,
      withScores: resultsResult.rows[0].withscores,
    },
    players: simulator
      .getPlayers()
      .map((p) => ({ userId: p.userId, username: p.username })),
  });
};

export const seedData = async (_req: Request, res: Response) => {
  await seedDatabase();
  res.json({
    success: true,
    message: "Seed data populated (or already existed)",
  });
};

export const getUsers = async (_req: Request, res: Response) => {
  const db = await getDb();
  const result = await db.query<UserRecord>(
    "SELECT id, username, isadmin, createdat FROM tipp_Users ORDER BY id",
  );
  const users = result.rows.map((u) => ({
    id: u.id,
    username: u.username,
    isAdmin: !!u.isadmin,
    createdAt: u.createdat,
  }));
  res.json(users);
};

export const getLiveResults = async (_req: Request, res: Response) => {
  try {
    const matches = await wc2026.getAllMatches();
    const results: Record<
      string,
      {
        homeScore: number | null;
        awayScore: number | null;
        isKnockout: boolean;
        roundName: string | null;
      }
    > = {};

    for (const match of matches) {
      const matchKey = mapMatchKey(match);
      results[matchKey] = {
        homeScore: match.home_score ?? null,
        awayScore: match.away_score ?? null,
        isKnockout: match.round !== "group",
        roundName: match.round === "group" ? null : match.round,
      };
    }

    res.json(results);
  } catch {
    res
      .status(500)
      .json({ error: "Failed to fetch live results from WC2026 API" });
  }
};
