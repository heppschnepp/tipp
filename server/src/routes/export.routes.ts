import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { generatePdf } from "../services/pdfExport.js";
import { getDb, sql } from "../db.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router: ReturnType<typeof Router> = Router();

router.get("/export-pdf", authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    const groupsResult = await db.query<{ GroupName: string }>(
      `SELECT DISTINCT GroupName FROM tipp_Teams WHERE GroupName IS NOT NULL ORDER BY GroupName`,
    );

    interface GroupData {
      teams: string[];
      matches: number[][];
    }
    interface Groups {
      [key: string]: GroupData;
    }
    const GROUPS: Groups = {};

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
        `SELECT DISTINCT MatchOrder FROM tipp_Matches WHERE GroupName = @group AND MatchType = 'group' ORDER BY MatchOrder`,
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
        ...new Set(matchOrders.map((o) => JSON.stringify(matchPairs[o]))),
      ].map((item) => JSON.parse(item));
      GROUPS[groupName] = { teams: teamNames, matches: uniquePairs };
    }

    interface KnockoutRound {
      id: string;
      name: string;
      matches: number;
    }
    const knockoutResult = await db.query<{ RoundName: string }>(`
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

    const knockout: KnockoutRound[] = knockoutResult.recordset.map((row) => {
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

    interface Score {
      homeScore: number | null;
      awayScore: number | null;
    }
    interface ScoresMap {
      [key: string]: Score;
    }
    const scoresMap: ScoresMap = {};

    if ((req as { user?: { isAdmin: boolean } }).user?.isAdmin) {
      const resultsResult = await db.query<{ MatchKey: string; HomeScore: number | null; AwayScore: number | null }>(
        'SELECT MatchKey, HomeScore, AwayScore FROM tipp_MatchResults',
      );
      resultsResult.recordset.forEach((row) => {
        scoresMap[row.MatchKey] = { homeScore: row.HomeScore, awayScore: row.AwayScore };
      });
    } else {
      const userId = (req as { user?: { userId: number } }).user?.userId;
      const request = db.request();
      request.input("userId", sql.Int, userId!);
      const predictionsResult = await request.query<{ MatchKey: string; HomeScore: number | null; AwayScore: number | null }>(
        'SELECT MatchKey, HomeScore, AwayScore FROM tipp_Predictions WHERE UserId = @userId',
      );
      predictionsResult.recordset.forEach((row) => {
        scoresMap[row.MatchKey] = { homeScore: row.HomeScore, awayScore: row.AwayScore };
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
  } catch (error) {
    console.error("PDF export error:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
}));

export { router as exportRouter };