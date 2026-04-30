import bcrypt from "bcryptjs";
import { type Request, type Response } from "express";
import { getDb, sql } from "../db.js";
import { simulator } from "../services/simulation.js";
import { seedDatabase } from "../services/seed.js";
import type { UserRecord } from "../types/db.js";
import type { ResetPasswordInput, SimulationInput } from "../validation/schemas.js";
import { NotFoundError } from "../middleware/errorHandler.js";

export const resetPassword = async (
  req: Request<unknown, unknown, ResetPasswordInput>,
  res: Response,
) => {
  const { userId, newPassword } = req.body;

  const db = await getDb();
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const request = db.request();
  request.input("userId", sql.Int, userId);
  request.input("passwordHash", sql.VarChar, passwordHash);
  const result = await request.query(
    "UPDATE tipp_Users SET PasswordHash = @passwordHash WHERE Id = @userId",
  );

  if (result.rowsAffected[0] === 0) {
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
  const resultsResult = await db.query<{ cnt: number; withScores: number }>(`
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
    "SELECT Id, Username, IsAdmin, CreatedAt FROM tipp_Users ORDER BY Id",
  );
  const users = result.recordset.map((u) => ({
    id: u.Id,
    username: u.Username,
    isAdmin: !!u.IsAdmin,
    createdAt: u.CreatedAt,
  }));
  res.json(users);
};
