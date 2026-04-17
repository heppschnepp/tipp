import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || "localhost",
  port: parseInt(process.env.DB_PORT || "1433"),
  database: process.env.DB_NAME || "tipp",
  user: process.env.DB_USER || "lportal",
  password: process.env.DB_PASSWORD || "lportal",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getDb(): Promise<sql.ConnectionPool> {
  if (pool?.connected) {
    return pool;
  }
  pool = await sql.connect(config);
  return pool;
}

export async function initDatabase(): Promise<void> {
  const pool = await getDb();

  const createTables = `
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_Users')
    BEGIN
      CREATE TABLE tipp_Users (
        Id INT PRIMARY KEY IDENTITY(1,1),
        Username NVARCHAR(50) UNIQUE NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        Email NVARCHAR(100),
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        IsAdmin BIT DEFAULT 0
      );
    END

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_Predictions')
    BEGIN
      CREATE TABLE tipp_Predictions (
        Id INT PRIMARY KEY IDENTITY(1,1),
        UserId INT FOREIGN KEY REFERENCES tipp_Users(Id),
        MatchKey NVARCHAR(20) NOT NULL,
        HomeScore INT NULL,
        AwayScore INT NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        UNIQUE(UserId, MatchKey)
      );
    END

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_MatchResults')
    BEGIN
      CREATE TABLE tipp_MatchResults (
        Id INT PRIMARY KEY IDENTITY(1,1),
        MatchKey NVARCHAR(20) UNIQUE NOT NULL,
        HomeScore INT NULL,
        AwayScore INT NULL,
        IsKnockout BIT DEFAULT 0,
        RoundName NVARCHAR(50),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        LastFetchedAt DATETIME2 NULL
      );
    END

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_GameSessions')
    BEGIN
      CREATE TABLE tipp_GameSessions (
        Id INT PRIMARY KEY IDENTITY(1,1),
        Name NVARCHAR(100) NOT NULL,
        CreatedBy INT FOREIGN KEY REFERENCES tipp_Users(Id),
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        IsActive BIT DEFAULT 1
      );
    END

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_SessionPlayers')
    BEGIN
      CREATE TABLE tipp_SessionPlayers (
        SessionId INT FOREIGN KEY REFERENCES tipp_GameSessions(Id),
        UserId INT FOREIGN KEY REFERENCES tipp_Users(Id),
        JoinedAt DATETIME2 DEFAULT GETDATE(),
        PRIMARY KEY (SessionId, UserId)
      );
    END

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_Teams')
    BEGIN
      CREATE TABLE tipp_Teams (
        Id INT PRIMARY KEY IDENTITY(1,1),
        Name NVARCHAR(50) UNIQUE NOT NULL,
        Code NVARCHAR(10),
        GroupName NVARCHAR(1)
      );
    END

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_Matches')
    BEGIN
      CREATE TABLE tipp_Matches (
        Id INT PRIMARY KEY IDENTITY(1,1),
        MatchKey NVARCHAR(20) UNIQUE NOT NULL,
        GroupName NVARCHAR(1),
        MatchType NVARCHAR(20) DEFAULT 'group',
        RoundName NVARCHAR(50),
        HomeTeamId INT FOREIGN KEY REFERENCES tipp_Teams(Id),
        AwayTeamId INT FOREIGN KEY REFERENCES tipp_Teams(Id),
        MatchOrder INT
      );
    END
  `;

  await pool.query(createTables);
  
  // Add LastFetchedAt column if it doesn't exist (for existing installations)
  await pool.query(`
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'tipp_MatchResults')
    BEGIN
      IF NOT EXISTS (SELECT * FROM sys.columns 
                     WHERE Name = 'LastFetchedAt' 
                     AND Object_ID = Object_ID('tipp_MatchResults'))
      BEGIN
        ALTER TABLE tipp_MatchResults ADD LastFetchedAt DATETIME2 NULL;
      END
    END
  `);
  
  console.log("Database initialized");
}

export { sql };
