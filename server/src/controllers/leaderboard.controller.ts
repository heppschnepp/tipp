import { type Request, type Response } from "express";
import { getDb } from "../db.js";
import type { SimpleMatchResult, PredictionRow, SimpleUserRecord } from "../types/db.js";

export interface LeaderboardEntry {
  userId: number;
  username: string;
  exact: number;
  outcome: number;
  total: number;
  predictionCount: number;
}

export const getLeaderboard = async (_req: Request, res: Response) => {
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
  const userPredictions: Record<number, Record<string, { h: number; a: number }>> = {};
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

  const predictionCountMap: Record<number, number> = {};
  predictionsResult.recordset.forEach((row) => {
    predictionCountMap[row.UserId] = (predictionCountMap[row.UserId] || 0) + 1;
  });

  const leaderboard: LeaderboardEntry[] = usersResult.recordset.map((row) => {
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
};
