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
     "SELECT matchkey, homescore, awayscore FROM tipp_matchresults WHERE homescore IS NOT NULL AND awayscore IS NOT NULL",
   );
   const results: Record<string, { h: number; a: number }> = {};
   if (resultsResult.rows) {
     resultsResult.rows.forEach((row) => {
       if (row) {
         results[row.matchkey] = { h: row.homescore, a: row.awayscore };
       }
     });
   }

   const predictionsResult = await db.query<PredictionRow>(
     "SELECT userid, matchkey, homescore, awayscore FROM tipp_predictions",
   );
   const userPredictions: Record<number, Record<string, { h: number; a: number }>> = {};
   if (predictionsResult.rows) {
     predictionsResult.rows.forEach((row) => {
       if (row) {
         if (!userPredictions[row.userid]) userPredictions[row.userid] = {};
         if (row.homescore !== null && row.awayscore !== null) {
           userPredictions[row.userid][row.matchkey] = {
             h: row.homescore,
             a: row.awayscore,
           };
         }
       }
     });
   }

   const usersResult = await db.query<SimpleUserRecord>(
     "SELECT id, username FROM tipp_users",
   );
  const users: Record<number, string> = {};
  if (usersResult.rows) {
    usersResult.rows.forEach((row) => {
      if (row) {
        users[row.id] = row.username;
      }
    });
  }

  const predictionCountMap: Record<number, number> = {};
  if (predictionsResult.rows) {
    predictionsResult.rows.forEach((row) => {
      if (row) {
        predictionCountMap[row.userid] = (predictionCountMap[row.userid] || 0) + 1;
      }
    });
  }

  const leaderboard: LeaderboardEntry[] = [];
  if (usersResult.rows) {
    usersResult.rows.forEach((row) => {
      if (row) {
        let exact = 0, outcome = 0, total = 0;
        const userPred = userPredictions[row.id] || {};

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

        leaderboard.push({
          userId: row.id,
          username: users[row.id] || '',
          exact,
          outcome,
          total,
          predictionCount: predictionCountMap[row.id] || 0,
        });
      }
    });
  }

  leaderboard.sort((a, b) => b.total - a.total);
  res.json(leaderboard);
};