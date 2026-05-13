import { type Request, type Response } from "express";
import { getDb } from "../db.js";
import type { GroupNameRow, CountRow } from "../types/db.js";

export interface GroupData {
  teams: string[];
  matches: number[][];
}

export interface Groups {
  [key: string]: GroupData;
}

export const getGroups = async (_req: Request, res: Response) => {
  const db = await getDb();

  const checkTable = await db.query<CountRow>(
    `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_name = 'tipp_teams'`
  );
  if (!checkTable.rows?.[0]?.cnt) {
    return res.json({});
  }

  const groupsResult = await db.query<GroupNameRow>(
    `SELECT DISTINCT groupname FROM tipp_teams WHERE groupname IS NOT NULL ORDER BY groupname`
  );

  const GROUPS: Groups = {};

  for (const row of groupsResult.rows || []) {
    const groupName = row.groupname;

    const teamsResult = await db.query<{ name: string }>(
      "SELECT name FROM tipp_teams WHERE groupname = $1 ORDER BY id",
      [groupName]
    );
    const teamNames = teamsResult.rows?.map((r) => r.name) || [];

    const matchesResult = await db.query<{ matchorder: number }>(
      `SELECT DISTINCT matchorder FROM tipp_matches 
       WHERE groupname = $1 AND matchtype = 'group'
       ORDER BY matchorder`,
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

  res.json(GROUPS);
};

export const getFlags = async (_req: Request, res: Response) => {
  const db = await getDb();
  const checkTable = await db.query<CountRow>(
    `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_name = 'tipp_teams'`
  );
  if (checkTable.rows[0].cnt === 0) {
    return res.json({ TBD: "❓" });
  }

  const result = await db.query<{ name: string; code: string }>(
    "SELECT name, code FROM tipp_teams"
  );

  const FLAG_EMOJI_MAP: Record<string, string> = {
    MEX: "🇲🇽",
    RSA: "🇿🇦",
    KOR: "🇰🇷",
    CZE: "🇨🇿",
    CAN: "🇨🇦",
    BIH: "🇧🇦",
    QAT: "🇶🇦",
    SUI: "🇨🇭",
    BRA: "🇧🇷",
    MAR: "🇲🇦",
    HAI: "🇭🇹",
    SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    USA: "🇺🇸",
    PAR: "🇵🇾",
    AUS: "🇦🇺",
    TUR: "🇹🇷",
    GER: "🇩🇪",
    CUR: "🇨🇼",
    CIV: "🇨🇮",
    ECU: "🇪🇨",
    NED: "🇳🇱",
    JPN: "🇯🇵",
    SWE: "🇸🇪",
    TUN: "🇹🇳",
    BEL: "🇧🇪",
    EGY: "🇪🇬",
    IRN: "🇮🇷",
    NZL: "🇳🇿",
    ESP: "🇪🇸",
    CPV: "🇨🇻",
    KSA: "🇸🇦",
    URU: "🇺🇾",
    FRA: "🇫🇷",
    SEN: "🇸🇳",
    IRQ: "🇮🇶",
    NOR: "🇳🇴",
    ARG: "🇦🇷",
    ALG: "🇩🇿",
    AUT: "🇦🇹",
    JOR: "🇯🇴",
    POR: "🇵🇹",
    COD: "🇨🇩",
    UZB: "🇺🇿",
    COL: "🇨🇴",
    ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    CRO: "🇭🇷",
    GHA: "🇬🇭",
    PAN: "🇵🇦",
    TBD: "❓",
  };

  const FLAGS: Record<string, string> = {};
  result.rows.forEach((row) => {
    FLAGS[row.name] = FLAG_EMOJI_MAP[row.code] || "❓";
  });
  FLAGS["TBD"] = "❓";
  res.json(FLAGS);
};

export const getKnockoutRounds = async (_req: Request, res: Response) => {
  const db = await getDb();
  const checkTable = await db.query<CountRow>(
    `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_name = 'tipp_matches'`
  );
  if (checkTable.rows[0].cnt === 0) {
    return res.json([]);
  }

  const result = await db.query<{ roundname: string; orderidx: number }>(`
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

  const rounds = result.rows.map((row) => {
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
  });

  res.json(rounds);
};

export const getMatches = async (_req: Request, res: Response) => {
   const db = await getDb();
   
   // Get all matches with team information
   const matchesResult = await db.query(`
     SELECT 
       m.matchkey,
       m.groupname,
       m.matchtype,
       m.roundname,
       m.matchorder,
       ht.name as hometeamname,
       at.name as awayteamname
     FROM tipp_matches m
     LEFT JOIN tipp_teams ht ON m.hometeamid = ht.id
     LEFT JOIN tipp_teams at ON m.awayteamid = at.id
     ORDER BY 
       CASE 
         WHEN m.matchtype = 'group' THEN 0 
         ELSE 1 
       END,
       m.groupname,
       m.matchorder
   `);
   
   const matches = matchesResult.rows.map(row => ({
     matchKey: row.matchkey,
     groupName: row.groupname,
     matchType: row.matchtype,
     roundName: row.roundname,
     matchOrder: row.matchorder,
     homeTeamName: row.hometeamname,
     awayTeamName: row.awayteamname
   }));
   
   res.json(matches);
};