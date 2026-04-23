import cron from "node-cron";
import { getDb, sql } from "../db.js";
import { wc2026, WC2026Match } from "./wc2026.js";

export class ResultScheduler {
  private isRunning: boolean = false;
  private lastRun: Date | null = null;
  private lastError: string | null = null;

  start() {
    if (!process.env.WC2026_API_KEY) {
      console.warn(
        "[Scheduler] WC2026_API_KEY not set. Automatic result fetching is DISABLED.",
      );
      return;
    }

    console.log(
      "Starting result scheduler (auto-fetch from WC2026 API every 15 min)...",
    );

    // Run every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
      if (this.isRunning) {
        console.log("Scheduler: Previous run still in progress, skipping...");
        return;
      }
      await this.fetchAndUpdateResults();
    });

    // Also run on startup after 30-second delay
    setTimeout(async () => {
      await this.fetchAndUpdateResults();
    }, 30000);
  }

  private async fetchAndUpdateResults() {
    this.isRunning = true;
    this.lastError = null;
    console.log(`[Scheduler] Fetching results at ${new Date().toISOString()}`);

    try {
      const matches = await wc2026.getAllMatches();
      const db = await getDb();

      let updated = 0;
      let skipped = 0;

      for (const match of matches) {
        // Only process matches that have both scores
        if (match.home_score === null || match.away_score === null) {
          skipped++;
          continue;
        }

        const matchKey = this.mapMatchKey(match);

        // Check if already exists with same scores (avoid redundant updates)
        const checkReq = db.request();
        checkReq.input("matchKey", sql.VarChar, matchKey);
        const existing = await checkReq.query(
          "SELECT HomeScore, AwayScore FROM tipp_MatchResults WHERE MatchKey = @matchKey",
        );

        const existingRow = existing.recordset[0];
        if (
          existingRow &&
          existingRow.HomeScore === match.home_score &&
          existingRow.AwayScore === match.away_score
        ) {
          skipped++;
          continue;
        }

        // Insert or update result
        const req = db.request();
        req.input("matchKey", sql.VarChar, matchKey);
        req.input("homeScore", sql.Int, match.home_score);
        req.input("awayScore", sql.Int, match.away_score);
        req.input("isKnockout", sql.Int, match.round !== "group" ? 1 : 0);
        req.input(
          "roundName",
          sql.VarChar,
          match.round === "group" ? null : match.round,
        );

        await req.query(`
          MERGE INTO tipp_MatchResults AS target
          USING (SELECT @matchKey AS MatchKey) AS source
          ON target.MatchKey = source.MatchKey
          WHEN MATCHED THEN
            UPDATE SET HomeScore = @homeScore, AwayScore = @awayScore, IsKnockout = @isKnockout, RoundName = @roundName, UpdatedAt = GETDATE(), LastFetchedAt = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (MatchKey, HomeScore, AwayScore, IsKnockout, RoundName, LastFetchedAt) 
            VALUES (@matchKey, @homeScore, @awayScore, @isKnockout, @roundName, GETDATE());
        `);

        updated++;
      }

      this.lastRun = new Date();
      console.log(
        `[Scheduler] Updated ${updated} matches, skipped ${skipped} (no scores or unchanged)`,
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.lastError = error.message;
      console.error("[Scheduler] Error fetching results:", error);
    } finally {
      this.isRunning = false;
    }
  }

  private mapMatchKey(match: WC2026Match): string {
    // Group stage: e.g., gA0, gA1, ... gL5
    if (match.round === "group" && match.group_name) {
      const groupIndex = match.group_name.charCodeAt(0) - 65; // A=0, B=1, ...
      const globalIdx = match.match_number - 1; // API match_number is 1-based
      const localIdx = globalIdx - groupIndex * 6;
      return `g${match.group_name}m${localIdx}`;
    }

    // Knockout stage: e.g., ko_r32_0, ko_r16_0, ...
    const roundOrder = [
      "Round of 32",
      "Round of 16",
      "Quarter-finals",
      "Semi-finals",
      "3rd Place",
      "Final",
    ];
    const roundIdMap: Record<string, string> = {
      "Round of 32": "r32",
      "Round of 16": "r16",
      "Quarter-finals": "qf",
      "Semi-finals": "sf",
      "3rd Place": "3rd",
      Final: "f",
    };

    const roundIdx = roundOrder.indexOf(match.round);
    if (roundIdx === -1) {
      return `match_${match.match_number}`;
    }

    // Each round's match count (in order)
    const roundCounts = [16, 8, 4, 2, 1, 1];
    // Total matches before this round = 72 (group) + sum of previous rounds
    let base = 72;
    for (let i = 0; i < roundIdx; i++) {
      base += roundCounts[i];
    }
    // First match number of this round = base + 1
    const localIdx = match.match_number - (base + 1);
    const roundId = roundIdMap[match.round];
    return `ko_${roundId}_${localIdx}`;
  }

  getStatus() {
    return {
      lastRun: this.lastRun,
      lastError: this.lastError,
      isRunning: this.isRunning,
      lastFetchTime: wc2026.getLastFetchTime(),
    };
  }
}

export const resultScheduler = new ResultScheduler();
