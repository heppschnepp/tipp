import { type Request, type Response } from "express";
import { getDb } from "../db.js";
import { resultScheduler } from "../services/scheduler.js";
import type { MatchResultRecord, LastFetchRecord, CountResultRecord, ResultInfo } from "../types/db.js";

export const getResults = async (_req: Request, res: Response) => {
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
};

export const getFetchStatus = async (req: Request, res: Response) => {
  const isAdmin = (req as { user?: { isAdmin: boolean } }).user?.isAdmin;
  if (!isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const db = await getDb();

    const lastFetchResult = await db.query<LastFetchRecord>(`
      SELECT MAX(LastFetchedAt) as lastFetched
      FROM tipp_MatchResults
      WHERE LastFetchedAt IS NOT NULL
    `);

    const lastFetched = lastFetchResult.recordset[0]?.lastFetched;

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
};
