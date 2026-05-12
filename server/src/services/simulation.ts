import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db.js";
import { seedDatabase } from "./seed.js";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";
const JWT_EXPIRES_IN = 604800; // 7 days in seconds

interface UserInfo {
  userId: number;
  username: string;
  token: string;
}

export class TournamentSimulator {
  private simulatedPlayers: UserInfo[] = [];
  private matchKeys: string[] = [];

  constructor() {
    this.generateMatchKeys();
  }

  private generateMatchKeys() {
    const groups = "ABCDEFGHIJKL";

    groups.split("").forEach((group) => {
      for (let i = 0; i < 6; i++) {
        this.matchKeys.push(`g${group}${i}`);
      }
    });

    const knockoutRounds = [
      { id: "r32", count: 16 },
      { id: "r16", count: 8 },
      { id: "qf", count: 4 },
      { id: "sf", count: 2 },
      { id: "3rd", count: 1 },
      { id: "f", count: 1 },
    ];

    knockoutRounds.forEach((round) => {
      for (let i = 0; i < round.count; i++) {
        this.matchKeys.push(`ko_${round.id}_${i}`);
      }
    });
  }

  private getRandomScore(max: number = 5): number {
    return Math.floor(Math.random() * (max + 1));
  }

  async createPlayers(count: number = 6): Promise<UserInfo[]> {
    const db = await getDb();
    const players: UserInfo[] = [];

    for (let i = 1; i <= count; i++) {
      const username = `player${i}`;
      const password = `test123`;

      const existing = await db.query(
        "SELECT id, isadmin FROM tipp_Users WHERE username = $1",
        [username]
      );

      let userId: number;
      let isAdmin = false;

        if (existing.rowCount !== null && existing.rowCount > 0) {
         userId = existing.rows[0].id;
         isAdmin = !!existing.rows[0].isadmin;
       } else {
         const passwordHash = await bcrypt.hash(password, 10);
         const result = await db.query<{ id: number }>(
           "INSERT INTO tipp_Users (username, passwordhash, isadmin) VALUES ($1, $2, $3) RETURNING id",
           [username, passwordHash, 0]
         );
         userId = result.rows[0].id;
       }

      const token = jwt.sign({ userId, username, isAdmin }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });

      players.push({ userId, username, token });
    }

    this.simulatedPlayers = players;
    return players;
  }

  async makeRandomPredictions(player: UserInfo): Promise<void> {
    const db = await getDb();

    for (const matchKey of this.matchKeys) {
      const homeScore = this.getRandomScore();
      const awayScore = this.getRandomScore();

      await db.query(
        `INSERT INTO tipp_Predictions (UserId, MatchKey, HomeScore, AwayScore, UpdatedAt)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (UserId, MatchKey) DO UPDATE
         SET HomeScore = EXCLUDED.HomeScore,
             AwayScore = EXCLUDED.AwayScore,
             UpdatedAt = EXCLUDED.UpdatedAt;`,
        [player.userId, matchKey, homeScore, awayScore]
      );
    }
  }

  async generateMatchResults(): Promise<void> {
    const db = await getDb();

    for (const matchKey of this.matchKeys) {
      const homeScore = this.getRandomScore(4);
      const awayScore = this.getRandomScore(4);
      const isKnockout = matchKey.startsWith("ko_");

      let roundName = null;
      if (matchKey.startsWith("g")) {
        roundName = "group";
      } else if (matchKey.includes("r32")) {
        roundName = "Round of 32";
      } else if (matchKey.includes("r16")) {
        roundName = "Round of 16";
      } else if (matchKey.includes("qf")) {
        roundName = "Quarter-finals";
      } else if (matchKey.includes("sf")) {
        roundName = "Semi-finals";
      } else if (matchKey.includes("3rd")) {
        roundName = "3rd Place";
      } else if (matchKey.includes("f_")) {
        roundName = "Final";
      }

      await db.query(
        `INSERT INTO tipp_MatchResults (MatchKey, HomeScore, AwayScore, IsKnockout, RoundName, UpdatedAt, LastFetchedAt)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (MatchKey) DO UPDATE
         SET HomeScore = EXCLUDED.HomeScore,
             AwayScore = EXCLUDED.AwayScore,
             IsKnockout = EXCLUDED.IsKnockout,
             RoundName = EXCLUDED.RoundName,
             UpdatedAt = NOW(),
             LastFetchedAt = NOW();`,
        [matchKey, homeScore, awayScore, isKnockout ? 1 : 0, roundName]
      );
    }
  }

  async runFullSimulation(playerCount: number = 6): Promise<{
    players: UserInfo[];
    predictionsMade: number;
    resultsGenerated: number;
  }> {
    await seedDatabase();

    const players = await this.createPlayers(playerCount);

    for (const player of players) {
      await this.makeRandomPredictions(player);
    }

    await this.generateMatchResults();

    return {
      players,
      predictionsMade: playerCount * this.matchKeys.length,
      resultsGenerated: this.matchKeys.length,
    };
  }

  async cleanupSimulationData(): Promise<{
    usersDeleted: number;
    predictionsDeleted: number;
    resultsDeleted: number;
  }> {
    const db = await getDb();

    let usersDeleted = 0;
    let predictionsDeleted = 0;
    let resultsDeleted = 0;

    if (this.simulatedPlayers.length > 0) {
      const userIds = this.simulatedPlayers.map((p) => p.userId);

      const predResult = await db.query(
        "DELETE FROM tipp_Predictions WHERE UserId = ANY($1)",
        [userIds]
      );
      predictionsDeleted = predResult.rowCount ?? 0;

      const userResult = await db.query(
        "DELETE FROM tipp_Users WHERE Id = ANY($1)",
        [userIds]
      );
      usersDeleted = userResult.rowCount ?? 0;

      this.simulatedPlayers = [];
    }

    const resultResult = await db.query("DELETE FROM tipp_MatchResults");
    resultsDeleted = resultResult.rowCount ?? 0;

    return {
      usersDeleted,
      predictionsDeleted,
      resultsDeleted,
    };
  }

  getMatchKeys(): string[] {
    return [...this.matchKeys];
  }

  getPlayers(): UserInfo[] {
    return [...this.simulatedPlayers];
  }
}

export const simulator = new TournamentSimulator();
