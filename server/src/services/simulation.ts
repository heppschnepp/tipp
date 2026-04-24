import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb, sql } from "../db.js";
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

      const checkReq = db.request();
      checkReq.input("username", sql.VarChar, username);
      const existing = await checkReq.query(
        "SELECT Id, IsAdmin FROM tipp_Users WHERE Username = @username",
      );

      let userId: number;
      let isAdmin = false;

      if (existing.recordset.length > 0) {
        userId = existing.recordset[0].Id;
        isAdmin = !!existing.recordset[0].IsAdmin;
      } else {
        const passwordHash = await bcrypt.hash(password, 10);
        const insertReq = db.request();
        insertReq.input("username", sql.VarChar, username);
        insertReq.input("passwordHash", sql.VarChar, passwordHash);
        insertReq.input("email", sql.VarChar, `${username}@test.com`);
        insertReq.input("isAdmin", sql.Int, 0);

        const result = await insertReq.query<{ Id: number }>(
          "INSERT INTO tipp_Users (Username, PasswordHash, Email, IsAdmin) OUTPUT INSERTED.Id VALUES (@username, @passwordHash, @email, @isAdmin)",
        );
        userId = result.recordset[0].Id;
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

      const request = db.request();
      request.input("userId", sql.Int, player.userId);
      request.input("matchKey", sql.VarChar, matchKey);
      request.input("homeScore", sql.Int, homeScore);
      request.input("awayScore", sql.Int, awayScore);

      await request.query(
        `MERGE INTO tipp_Predictions AS target
         USING (SELECT @userId AS UserId, @matchKey AS MatchKey) AS source
         ON target.UserId = source.UserId AND target.MatchKey = source.MatchKey
         WHEN MATCHED THEN
           UPDATE SET HomeScore = @homeScore, AwayScore = @awayScore, UpdatedAt = GETDATE()
         WHEN NOT MATCHED THEN
           INSERT (UserId, MatchKey, HomeScore, AwayScore) VALUES (@userId, @matchKey, @homeScore, @awayScore);`,
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

      const request = db.request();
      request.input("matchKey", sql.VarChar, matchKey);
      request.input("homeScore", sql.Int, homeScore);
      request.input("awayScore", sql.Int, awayScore);
      request.input("isKnockout", sql.Int, isKnockout ? 1 : 0);
      request.input("roundName", sql.VarChar, roundName);

      await request.query(
        `MERGE INTO tipp_MatchResults AS target
         USING (SELECT @matchKey AS MatchKey) AS source
         ON target.MatchKey = source.MatchKey
         WHEN MATCHED THEN
           UPDATE SET HomeScore = @homeScore, AwayScore = @awayScore, IsKnockout = @isKnockout, RoundName = @roundName, UpdatedAt = GETDATE(), LastFetchedAt = GETDATE()
         WHEN NOT MATCHED THEN
           INSERT (MatchKey, HomeScore, AwayScore, IsKnockout, RoundName, UpdatedAt, LastFetchedAt) VALUES (@matchKey, @homeScore, @awayScore, @isKnockout, @roundName, GETDATE(), GETDATE());`,
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

      const predReq = db.request();
      userIds.forEach((id, idx) => {
        predReq.input(`id${idx}`, sql.Int, id);
      });
      const predResult = await predReq.query(
        `DELETE FROM tipp_Predictions WHERE UserId IN (${userIds.map((_, idx) => `@id${idx}`).join(",")})`,
      );
      predictionsDeleted = predResult.rowsAffected[0];

      const userReq = db.request();
      userIds.forEach((id, idx) => {
        userReq.input(`id${idx}`, sql.Int, id);
      });
      const userResult = await userReq.query(
        `DELETE FROM tipp_Users WHERE Id IN (${userIds.map((_, idx) => `@id${idx}`).join(",")})`,
      );
      usersDeleted = userResult.rowsAffected[0];

      this.simulatedPlayers = [];
    }

    const resultReq = db.request();
    const resultResult = await resultReq.query("DELETE FROM tipp_MatchResults");
    resultsDeleted = resultResult.rowsAffected[0];

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
