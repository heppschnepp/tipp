import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { generatePdf } from "../services/pdfExport.js";
import { getDb } from "../db.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { UnauthorizedError } from "../middleware/errorHandler.js";

const router: ReturnType<typeof Router> = Router();

router.get("/export-pdf", authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();

  const groupsResult = await db.query<{ groupname: string }>(
    `SELECT DISTINCT groupname FROM tipp_teams WHERE groupname IS NOT NULL ORDER BY groupname`,
  );

  interface GroupData {
    teams: string[];
    matches: number[][];
  }
  interface Groups {
    [key: string]: GroupData;
  }
  const GROUPS: Groups = {};

  for (const row of groupsResult.rows || []) {
    const groupName = row.groupname;
    const teamsResult = await db.query<{ name: string }>(
      "SELECT name FROM tipp_teams WHERE groupname = $1 ORDER BY id",
      [groupName]
    );
    const teamNames = teamsResult.rows?.map((r) => r.name) || [];

    const matchesResult = await db.query<{ matchorder: number }>(
      `SELECT DISTINCT matchorder FROM tipp_matches WHERE groupname = $1 AND matchtype = 'group' ORDER BY matchorder`,
      [groupName]
    );
    const matchOrders = matchesResult.rows?.map((r) => r.matchorder) || [];

    const matchPairs: Record<number, number[]> = {
      0: [0, 1],
      1: [2, 3],
      2: [0, 2],
      3: [1, 3],
      4: [0, 3],
      5: [1, 2],
    };

    const uniquePairs = [
      ...new Set(matchOrders.map((o) => JSON.stringify(matchPairs[o]))),
    ].map((item) => JSON.parse(item));
    GROUPS[groupName] = { teams: teamNames, matches: uniquePairs };
  }

  interface KnockoutRound {
    id: string;
    name: string;
    matches: number;
  }
  const knockoutResult = await db.query<{ roundname: string }>(`
    SELECT DISTINCT roundname,
      CASE roundname 
        WHEN 'round of 32' THEN 1 
        WHEN 'round of 16' THEN 2 
        WHEN 'quarter-finals' THEN 3 
        WHEN 'semi-finals' THEN 4 
        WHEN '3rd place' THEN 5 
        WHEN 'final' THEN 6 
      END AS orderidx
    FROM tipp_matches WHERE matchtype = 'knockout' AND roundname IS NOT NULL ORDER BY orderidx
  `);

  const knockout: KnockoutRound[] = knockoutResult.rows?.map((row) => {
    const name = row.roundname;
    let matches = 1;
    if (name === "round of 32") matches = 16;
    else if (name === "round of 16") matches = 8;
    else if (name === "quarter-finals") matches = 4;
    else if (name === "semi-finals") matches = 2;

    let id = "f";
    if (name === "round of 32") id = "r32";
    else if (name === "round of 16") id = "r16";
    else if (name === "quarter-finals") id = "qf";
    else if (name === "semi-finals") id = "sf";
    else if (name === "3rd place") id = "3rd";

    return { id, name, matches };
  }) || [];

   interface Score {
     homeScore: number | null;
     awayScore: number | null;
   }
  interface ScoresMap {
    [key: string]: Score;
  }
  const scoresMap: ScoresMap = {};

   if ((req as { user?: { isAdmin: boolean } }).user?.isAdmin) {
     const resultsResult = await db.query<{ matchkey: string; homescore: number | null; awayscore: number | null }>(
       'SELECT matchkey, homescore, awayscore FROM tipp_matchresults',
     );
     resultsResult.rows?.forEach((row) => {
       if (row) {
         scoresMap[row.matchkey] = { homeScore: row.homescore, awayScore: row.awayscore };
       }
     });
   } else {
     const userId = (req as { user?: { userid: number } }).user?.userid;
     if (!userId) {
       throw new UnauthorizedError("Not authenticated");
     }
     const predictionsResult = await db.query<{ matchkey: string; homescore: number | null; awayscore: number | null }>(
       'SELECT matchkey, homescore, awayscore FROM tipp_predictions WHERE userid = $1',
       [userId]
     );
     predictionsResult.rows?.forEach((row) => {
       if (row) {
         scoresMap[row.matchkey] = { homeScore: row.homescore, awayScore: row.awayscore };
       }
     });
   }

  const pdfBuffer = await generatePdf(GROUPS, knockout, scoresMap);

  res.setHeader("Content-Type", "application/pdf");
  const dateStr = new Date().toISOString().split("T")[0];
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="worldcup2026_matches_${dateStr}.pdf"`,
  );
  res.send(pdfBuffer);
}));

export { router as exportRouter };