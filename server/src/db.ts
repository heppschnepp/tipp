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
        -- Create tipp_users table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_users') THEN
          CREATE TABLE tipp_users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            passwordhash VARCHAR(255) NOT NULL,
            email VARCHAR(100),
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            isadmin BOOLEAN DEFAULT FALSE
          );
        END IF;

        -- Create tipp_predictions table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_predictions') THEN
          CREATE TABLE tipp_predictions (
            id SERIAL PRIMARY KEY,
            userid INTEGER REFERENCES tipp_users(id),
            matchkey VARCHAR(20) NOT NULL,
            homescore INTEGER NULL,
            awayscore INTEGER NULL,
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(userid, matchkey)
          );
        END IF;

        -- Create tipp_matchresults table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_matchresults') THEN
          CREATE TABLE tipp_matchresults (
            id SERIAL PRIMARY KEY,
            matchkey VARCHAR(20) UNIQUE NOT NULL,
            homescore INTEGER NULL,
            awayscore INTEGER NULL,
            isknockout BOOLEAN DEFAULT FALSE,
            roundname VARCHAR(50),
            updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            lastfetchedat TIMESTAMP NULL
          );
        END IF;

        -- Create tipp_gamesessions table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_gamesessions') THEN
          CREATE TABLE tipp_gamesessions (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            createdby INTEGER REFERENCES tipp_users(id),
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            isactive BOOLEAN DEFAULT TRUE
          );
        END IF;

        -- Create tipp_sessionplayers table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_sessionplayers') THEN
          CREATE TABLE tipp_sessionplayers (
            sessionid INTEGER REFERENCES tipp_gamesessions(id),
            userid INTEGER REFERENCES tipp_users(id),
            joinedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (sessionid, userid)
          );
        END IF;

        -- Create tipp_teams table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_teams') THEN
          CREATE TABLE tipp_teams (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL,
            code VARCHAR(10),
            groupname CHAR(1)
          );
        END IF;

        -- Create tipp_matches table if it doesn't exist
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_matches') THEN
          CREATE TABLE tipp_matches (
            id SERIAL PRIMARY KEY,
            matchkey VARCHAR(20) UNIQUE NOT NULL,
            groupname CHAR(1),
            matchtype VARCHAR(20) DEFAULT 'group',
            roundname VARCHAR(50),
            hometeamid INTEGER REFERENCES tipp_teams(id),
            awayteamid INTEGER REFERENCES tipp_teams(id),
            matchorder INTEGER
          );
        END IF;
      END $$;
    `;

    await client.query(createTables);
    
    // Add lastfetchedat column if it doesn't exist (for existing installations)
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tipp_matchresults') THEN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'tipp_matchresults' AND column_name = 'lastfetchedat') THEN
            ALTER TABLE tipp_matchresults ADD COLUMN lastfetchedat TIMESTAMP NULL;
          END IF;
        END IF;
      END $$;
    `);
    
    console.log("Database initialized");
  } finally {
    client.release();
  }
}
