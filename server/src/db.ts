import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_SERVER || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "tipp",
  user: process.env.DB_USER || "lportal",
  password: process.env.DB_PASSWORD || "Admin1234!",
});

export async function getDb(): Promise<Pool> {
  return pool;
}

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();

  try {
    const createTables = `
      DO $$
      BEGIN
        -- Create tipp_Users table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_users') THEN
          CREATE TABLE tipp_Users (
            Id SERIAL PRIMARY KEY,
            Username VARCHAR(50) UNIQUE NOT NULL,
            PasswordHash VARCHAR(255) NOT NULL,
            Email VARCHAR(100),
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            IsAdmin BOOLEAN DEFAULT FALSE
          );
        END IF;

        -- Create tipp_Predictions table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_predictions') THEN
          CREATE TABLE tipp_Predictions (
            Id SERIAL PRIMARY KEY,
            UserId INTEGER REFERENCES tipp_Users(Id),
            MatchKey VARCHAR(20) NOT NULL,
            HomeScore INTEGER NULL,
            AwayScore INTEGER NULL,
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(UserId, MatchKey)
          );
        END IF;

        -- Create tipp_MatchResults table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_matchresults') THEN
          CREATE TABLE tipp_MatchResults (
            Id SERIAL PRIMARY KEY,
            MatchKey VARCHAR(20) UNIQUE NOT NULL,
            HomeScore INTEGER NULL,
            AwayScore INTEGER NULL,
            IsKnockout BOOLEAN DEFAULT FALSE,
            RoundName VARCHAR(50),
            UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            LastFetchedAt TIMESTAMP NULL
          );
        END IF;

        -- Create tipp_GameSessions table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_gamesessions') THEN
          CREATE TABLE tipp_GameSessions (
            Id SERIAL PRIMARY KEY,
            Name VARCHAR(100) NOT NULL,
            CreatedBy INTEGER REFERENCES tipp_Users(Id),
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            IsActive BOOLEAN DEFAULT TRUE
          );
        END IF;

        -- Create tipp_SessionPlayers table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_sessionplayers') THEN
          CREATE TABLE tipp_SessionPlayers (
            SessionId INTEGER REFERENCES tipp_GameSessions(Id),
            UserId INTEGER REFERENCES tipp_Users(Id),
            JoinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (SessionId, UserId)
          );
        END IF;

        -- Create tipp_Teams table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_teams') THEN
          CREATE TABLE tipp_Teams (
            Id SERIAL PRIMARY KEY,
            Name VARCHAR(50) UNIQUE NOT NULL,
            Code VARCHAR(10),
            GroupName CHAR(1)
          );
        END IF;

        -- Create tipp_Matches table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_matches') THEN
          CREATE TABLE tipp_Matches (
            Id SERIAL PRIMARY KEY,
            MatchKey VARCHAR(20) UNIQUE NOT NULL,
            GroupName CHAR(1),
            MatchType VARCHAR(20) DEFAULT 'group',
            RoundName VARCHAR(50),
            HomeTeamId INTEGER REFERENCES tipp_Teams(Id),
            AwayTeamId INTEGER REFERENCES tipp_Teams(Id),
            MatchOrder INTEGER
          );
        END IF;
      END $$;
    `;

    await client.query(createTables);
    
    // Add LastFetchedAt column if it doesn't exist (for existing installations)
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_matchresults') THEN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'tipp_matchresults' AND column_name = 'lastfetchedat') THEN
            ALTER TABLE tipp_MatchResults ADD COLUMN LastFetchedAt TIMESTAMP NULL;
          END IF;
        END IF;
      END $$;
    `);
    
    console.log("Database initialized");
  } finally {
    client.release();
  }
}
