import { type Request, type Response } from "express";
import { getDb } from "../db.js";
import { resultScheduler } from "../services/scheduler.js";
import type { MatchResultRecord, LastFetchRecord, CountResultRecord, ResultInfo } from "../types/db.js";
import { ForbiddenError } from "../middleware/errorHandler.js";

export const getResults = async (_req: Request, res: Response) => {
  const db = await getDb();
  const result = await db.query<MatchResultRecord>(
    "SELECT matchkey, homescore, awayscore, isknockout, roundname FROM tipp_matchresults",
  );

  const results: Record<string, ResultInfo> = {};
  result.rows.forEach((row) => {
    results[row.matchkey] = {
      homeScore: row.homescore,
      awayScore: row.awayscore,
      isKnockout: row.isknockout,
      roundName: row.roundname,
    };
  });

  res.json(results);
};

export const getFetchStatus = async (req: Request, res: Response) => {
  const isAdmin = (req as { user?: { isadmin: boolean } }).user?.isadmin;
  if (!isAdmin) {
    throw new ForbiddenError("Admin access required");
  }

  const db = await getDb();

  const lastFetchResult = await db.query<LastFetchRecord>(`
    SELECT MAX(lastfetched) as lastfetched
    FROM tipp_matchresults
    WHERE lastfetched IS NOT NULL
  `);

  const lastFetched = lastFetchResult.rows[0]?.lastfetched;

  const countResult = await db.query<CountResultRecord>(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN homescores IS NOT NULL AND awayscore IS NOT NULL THEN 1 ELSE 0 END) as withscores
  FROM tipp_matchresults
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
    database: countResult.rows[0],
  });
};