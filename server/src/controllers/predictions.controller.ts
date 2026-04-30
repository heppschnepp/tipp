import { type Request, type Response } from "express";
import { getDb, sql } from "../db.js";
import type { PredictionRow } from "../types/db.js";
import type { PredictionInput } from "../validation/schemas.js";

export const getUserPredictions = async (req: Request, res: Response) => {
  const userId = (req as { user?: { userId: number } }).user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const db = await getDb();
  const request = db.request();
  request.input("userId", sql.Int, userId);
  const result = await request.query<PredictionRow>(
    "SELECT MatchKey, HomeScore, AwayScore FROM tipp_Predictions WHERE UserId = @userId",
  );

  const predictions: Record<string, { homeScore: number | null; awayScore: number | null }> = {};
  result.recordset.forEach((row) => {
    predictions[row.MatchKey] = {
      homeScore: row.HomeScore,
      awayScore: row.AwayScore,
    };
  });

  res.json(predictions);
};

export const savePrediction = async (
  req: Request<unknown, unknown, PredictionInput>,
  res: Response,
) => {
  const { matchKey, homeScore, awayScore } = req.body;
  const userId = (req as { user?: { userId: number } }).user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const db = await getDb();
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
};

export const deletePrediction = async (req: Request, res: Response) => {
  const userId = (req as { user?: { userId: number } }).user?.userId;
  const matchKey = req.params.matchKey;

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const db = await getDb();
  const request = db.request();
  request.input("userId", sql.Int, userId);
  request.input("matchKey", sql.VarChar, matchKey);
  await request.query(
    "DELETE FROM tipp_Predictions WHERE UserId = @userId AND MatchKey = @matchKey",
  );

  res.json({ success: true });
};
