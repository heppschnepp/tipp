import { getDb, sql } from "../db.js";

export const SEED_TEAMS = [
  { name: "Mexico", code: "MEX", group: "A" },
  { name: "South Africa", code: "RSA", group: "A" },
  { name: "South Korea", code: "KOR", group: "A" },
  { name: "Czech Republic", code: "CZE", group: "A" },
  { name: "Canada", code: "CAN", group: "B" },
  { name: "Bosnia & Herzegovina", code: "BIH", group: "B" },
  { name: "Qatar", code: "QAT", group: "B" },
  { name: "Switzerland", code: "SUI", group: "B" },
  { name: "Brazil", code: "BRA", group: "C" },
  { name: "Morocco", code: "MAR", group: "C" },
  { name: "Haiti", code: "HAI", group: "C" },
  { name: "Scotland", code: "SCO", group: "C" },
  { name: "USA", code: "USA", group: "D" },
  { name: "Paraguay", code: "PAR", group: "D" },
  { name: "Australia", code: "AUS", group: "D" },
  { name: "Turkey", code: "TUR", group: "D" },
  { name: "Germany", code: "GER", group: "E" },
  { name: "Curaçao", code: "CUR", group: "E" },
  { name: "Ivory Coast", code: "CIV", group: "E" },
  { name: "Ecuador", code: "ECU", group: "E" },
  { name: "Netherlands", code: "NED", group: "F" },
  { name: "Japan", code: "JPN", group: "F" },
  { name: "Sweden", code: "SWE", group: "F" },
  { name: "Tunisia", code: "TUN", group: "F" },
  { name: "Belgium", code: "BEL", group: "G" },
  { name: "Egypt", code: "EGY", group: "G" },
  { name: "Iran", code: "IRN", group: "G" },
  { name: "New Zealand", code: "NZL", group: "G" },
  { name: "Spain", code: "ESP", group: "H" },
  { name: "Cape Verde", code: "CPV", group: "H" },
  { name: "Saudi Arabia", code: "KSA", group: "H" },
  { name: "Uruguay", code: "URU", group: "H" },
  { name: "France", code: "FRA", group: "I" },
  { name: "Senegal", code: "SEN", group: "I" },
  { name: "Iraq", code: "IRQ", group: "I" },
  { name: "Norway", code: "NOR", group: "I" },
  { name: "Argentina", code: "ARG", group: "J" },
  { name: "Algeria", code: "ALG", group: "J" },
  { name: "Austria", code: "AUT", group: "J" },
  { name: "Jordan", code: "JOR", group: "J" },
  { name: "Portugal", code: "POR", group: "K" },
  { name: "DR Congo", code: "COD", group: "K" },
  { name: "Uzbekistan", code: "UZB", group: "K" },
  { name: "Colombia", code: "COL", group: "K" },
  { name: "England", code: "ENG", group: "L" },
  { name: "Croatia", code: "CRO", group: "L" },
  { name: "Ghana", code: "GHA", group: "L" },
  { name: "Panama", code: "PAN", group: "L" },
  { name: "TBD", code: "TBD", group: null },
];

export const GROUP_MATCHES = [
  {
    group: "A",
    matches: [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ],
  },
  {
    group: "B",
    matches: [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ],
  },
  {
    group: "C",
    matches: [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ],
  },
  {
    group: "D",
    matches: [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ],
  },
  {
    group: "E",
    matches: [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ],
  },
  {
    group: "F",
    matches: [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ],
  },
  {
    group: "G",
    matches: [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ],
  },
  {
    group: "H",
    matches: [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ],
  },
  {
    group: "I",
    matches: [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ],
  },
  {
    group: "J",
    matches: [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ],
  },
  {
    group: "K",
    matches: [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ],
  },
  {
    group: "L",
    matches: [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ],
  },
];

export const KNOCKOUT_ROUNDS = [
  { round: "Round of 32", count: 16 },
  { round: "Round of 16", count: 8 },
  { round: "Quarter-finals", count: 4 },
  { round: "Semi-finals", count: 2 },
  { round: "3rd Place", count: 1 },
  { round: "Final", count: 1 },
];

export async function seedDatabase(): Promise<void> {
  const db = await getDb();

  // Check if teams already exist
  const teamsCheck = await db.query("SELECT COUNT(*) as cnt FROM tipp_Teams");
  const teamsExist = teamsCheck.recordset[0].cnt > 0;

  // Insert teams if missing
  if (!teamsExist) {
    console.log("Inserting teams...");
    for (const team of SEED_TEAMS) {
      const req = db.request();
      req.input("name", sql.NVarChar, team.name);
      req.input("code", sql.NVarChar, team.code);
      req.input("group", sql.NVarChar, team.group);
      await req.query(
        "INSERT INTO tipp_Teams (Name, Code, GroupName) VALUES (@name, @code, @group)",
      );
    }
  } else {
    console.log("Teams already exist, skipping team insertion.");
  }

  // Ensure group matches exist (idempotent)
  console.log("Ensuring group stage matches...");
  for (const gm of GROUP_MATCHES) {
    const teamsReq = db.request();
    teamsReq.input("group", sql.NVarChar, gm.group);
    const teamsResult = await teamsReq.query(
      "SELECT Id, Name FROM tipp_Teams WHERE GroupName = @group ORDER BY Id",
    );
    const teamIds = teamsResult.recordset.map((r: { Id: number }) => r.Id);

    if (teamIds.length < 4) {
      console.warn(
        `Group ${gm.group} has only ${teamIds.length} teams, expected 4. Skipping...`,
      );
      continue;
    }

    for (let i = 0; i < gm.matches.length; i++) {
      const [homeIdx, awayIdx] = gm.matches[i];
      const matchKey = `g${gm.group}m${i}`;
      const matchReq = db.request();
      matchReq.input("matchKey", sql.NVarChar, matchKey);
      matchReq.input("group", sql.NVarChar, gm.group);
      matchReq.input("homeId", sql.Int, teamIds[homeIdx]);
      matchReq.input("awayId", sql.Int, teamIds[awayIdx]);
      matchReq.input("order", sql.Int, i);
      await matchReq.query(
        `IF NOT EXISTS (SELECT 1 FROM tipp_Matches WHERE MatchKey = @matchKey)
         INSERT INTO tipp_Matches (MatchKey, GroupName, MatchType, RoundName, HomeTeamId, AwayTeamId, MatchOrder)
         VALUES (@matchKey, @group, 'group', NULL, @homeId, @awayId, @order)`,
      );
    }
  }

  // Ensure knockout matches exist (idempotent)
  console.log("Ensuring knockout stage matches...");
  for (const kr of KNOCKOUT_ROUNDS) {
    for (let i = 0; i < kr.count; i++) {
      const roundId =
        kr.round === "Round of 32"
          ? "r32"
          : kr.round === "Round of 16"
            ? "r16"
            : kr.round === "Quarter-finals"
              ? "qf"
              : kr.round === "Semi-finals"
                ? "sf"
                : kr.round === "3rd Place"
                  ? "3rd"
                  : "f";
      const matchKey = `ko_${roundId}_${i}`;
      const koReq = db.request();
      koReq.input("matchKey", sql.NVarChar, matchKey);
      koReq.input("round", sql.NVarChar, kr.round);
      koReq.input("order", sql.Int, i);
      await koReq.query(
        `IF NOT EXISTS (SELECT 1 FROM tipp_Matches WHERE MatchKey = @matchKey)
         INSERT INTO tipp_Matches (MatchKey, GroupName, MatchType, RoundName, HomeTeamId, AwayTeamId, MatchOrder)
         VALUES (@matchKey, NULL, 'knockout', @round, NULL, NULL, @order)`,
      );
    }
  }

  console.log("Database seeding complete");
}
