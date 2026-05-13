import cron from "node-cron";
import { getDb } from "../db.js";
import { wc2026 } from "./wc2026.js";
import { mapMatchKey } from "./match-key-mapper.js";

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

        const matchKey = mapMatchKey(match);

        // Check if already exists with same scores (avoid redundant updates)
        const existing = await db.query(
          "SELECT homescore, awayscore FROM tipp_matchresults WHERE matchkey = $1",
          [matchKey]
        );

        const existingRow = existing.rows[0];
        if (
          existingRow &&
          existingRow.homescore === match.home_score &&
          existingRow.awayscore === match.away_score
        ) {
          skipped++;
          continue;
        }

        // Insert or update result using ON CONFLICT
        await db.query(
          `
          INSERT INTO tipp_matchresults (matchkey, homescore, awayscore, isknockout, roundname, updatedat, lastfetchedat)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (matchkey) DO UPDATE
          SET homescore = EXCLUDED.homescore,
              awayscore = EXCLUDED.awayscore,
              isknockout = EXCLUDED.isknockout,
              roundname = EXCLUDED.roundname,
              updatedat = NOW(),
              lastfetchedat = NOW();
          `,
          [matchKey, match.home_score, match.away_score, match.round !== "group" ? 1 : 0, match.round === "group" ? null : match.round]
        );

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
