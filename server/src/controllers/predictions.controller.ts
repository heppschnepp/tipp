import { type Request, type Response } from "express";
import { getDb } from "../db.js";
import type { PredictionRow } from "../types/db.js";
import type { PredictionInput } from "../validation/schemas.js";
import { UnauthorizedError } from "../middleware/errorHandler.js";
import { ValidatedRequest } from "../validation/validate.js";

export const getUserPredictions = async (req: Request, res: Response) => {
  const userId = (req as { user?: { userId: number } }).user?.userId;
  if (!userId) {
    throw new UnauthorizedError("Not authenticated");
  }

  const db = await getDb();
  const result = await db.query<PredictionRow>(
    "SELECT matchkey, homescore, awayscore FROM tipp_predictions WHERE userid = $1",
    [userId]
  );

  const predictions: Record<string, { homeScore: number | null; awayScore: number | null }> = {};
  result.rows.forEach((row) => {
    if (row) {
      predictions[row.matchkey] = {
        homeScore: row.homescore,
        awayScore: row.awayscore,
      };
    }
  });

  res.json(predictions);
};

export const savePrediction = async (
   req: Request,
   res: Response,
) => {
   const validated = (req as ValidatedRequest<PredictionInput>).validated;
   if (!validated) {
      throw new UnauthorizedError("Invalid request");
   }
   const { matchKey, homeScore, awayScore } = validated;
   const userId = (req as { user?: { userId: number } }).user?.userId;

   if (!userId) {
      throw new UnauthorizedError("Not authenticated");
   }

   const db = await getDb();
   await db.query(
      `INSERT INTO tipp_predictions (userid, matchkey, homescore, awayscore, updatedat)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (userid, matchkey) DO UPDATE
       SET homescore = EXCLUDED.homescore,
           awayscore = EXCLUDED.awayscore,
           updatedat = EXCLUDED.updatedat;`,
      [userId, matchKey, homeScore, awayScore]
   );

   res.json({ success: true });
};

export const deletePrediction = async (req: Request, res: Response) => {
   const userId = (req as { user?: { userId: number } }).user?.userId;
   const matchKey = req.params.matchKey;

   if (!userId) {
      throw new UnauthorizedError("Not authenticated");
   }

   const db = await getDb();
   await db.query(
      "DELETE FROM tipp_predictions WHERE userid = $1 AND matchkey = $2",
      [userId, matchKey]
   );

   res.json({ success: true });
};