import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

export async function createTestDatabase(): Promise<string> {
  const dbName = `tipp_test_${Date.now()}`;

  const masterConfig: sql.config = {
    server: process.env.DB_SERVER || "localhost",
    port: parseInt(process.env.DB_PORT || "1433"),
    database: "master",
    user: process.env.DB_USER || "lportal",
    password: process.env.DB_PASSWORD || "lportal",
    options: { encrypt: true, trustServerCertificate: true },
  };

  try {
    const pool = await sql.connect(masterConfig);
    await pool.request().query(`CREATE DATABASE [${dbName}]`);

    const testConfig: sql.config = { ...masterConfig, database: dbName };
    const testPool = await sql.connect(testConfig);
    await initializeSchema(testPool);
    await seedBasicData(testPool);

    return dbName;
  } catch (err) {
    console.error("Failed to create test database:", err);
    throw err;
  }
}

async function initializeSchema(pool: sql.ConnectionPool): Promise<void> {
  const schema = `
    CREATE TABLE tipp_Users (
      Id INT PRIMARY KEY IDENTITY(1,1),
      Username NVARCHAR(50) UNIQUE NOT NULL,
      PasswordHash NVARCHAR(255) NOT NULL,
      Email NVARCHAR(100),
      CreatedAt DATETIME2 DEFAULT GETDATE(),
      IsAdmin BIT DEFAULT 0
    );
    CREATE TABLE tipp_Predictions (
      Id INT PRIMARY KEY IDENTITY(1,1),
      UserId INT FOREIGN KEY REFERENCES tipp_Users(Id),
      MatchKey NVARCHAR(20) NOT NULL,
      HomeScore INT NULL, AwayScore INT NULL,
      CreatedAt DATETIME2 DEFAULT GETDATE(),
      UpdatedAt DATETIME2 DEFAULT GETDATE(),
      UNIQUE(UserId, MatchKey)
    );
    CREATE TABLE tipp_MatchResults (
      Id INT PRIMARY KEY IDENTITY(1,1),
      MatchKey NVARCHAR(20) UNIQUE NOT NULL,
      HomeScore INT NULL, AwayScore INT NULL,
      IsKnockout BIT DEFAULT 0, RoundName NVARCHAR(50),
      UpdatedAt DATETIME2 DEFAULT GETDATE(),
      LastFetchedAt DATETIME2 NULL
    );
    CREATE TABLE tipp_Teams (
      Id INT PRIMARY KEY IDENTITY(1,1),
      Name NVARCHAR(50) UNIQUE NOT NULL,
      Code NVARCHAR(10), GroupName NVARCHAR(1)
    );
    CREATE TABLE tipp_Matches (
      Id INT PRIMARY KEY IDENTITY(1,1),
      MatchKey NVARCHAR(20) UNIQUE NOT NULL,
      GroupName NVARCHAR(1), MatchType NVARCHAR(20) DEFAULT 'group',
      RoundName NVARCHAR(50),
      HomeTeamId INT FOREIGN KEY REFERENCES tipp_Teams(Id),
      AwayTeamId INT FOREIGN KEY REFERENCES tipp_Teams(Id),
      MatchOrder INT
    );
  `;
  await pool.query(schema);
}

async function seedBasicData(pool: sql.ConnectionPool): Promise<void> {
  const teams = [
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
  ];

  for (const team of teams) {
    await pool
      .request()
      .input("name", sql.NVarChar, team.name)
      .input("code", sql.NVarChar, team.code)
      .input("group", sql.NVarChar, team.group)
      .query(
        "INSERT INTO tipp_Teams (Name, Code, GroupName) VALUES (@name, @code, @group)",
      );
  }

  for (const group of ["A", "B", "C"]) {
    const matchPairs = [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2],
    ];
    for (let i = 0; i < 6; i++) {
      const [homeIdx, awayIdx] = matchPairs[i];
      const matchKey = `g${group}m${i}`;
      await pool
        .request()
        .input("matchKey", sql.NVarChar, matchKey)
        .input("group", sql.NVarChar, group)
        .input("idx", sql.Int, i)
        .input("homeIdx", sql.Int, homeIdx)
        .input("awayIdx", sql.Int, awayIdx).query(`
           INSERT INTO tipp_Matches (MatchKey, GroupName, MatchType, HomeTeamId, AwayTeamId, MatchOrder)
           SELECT @matchKey, @group, 'group', t1.Id, t2.Id, @idx
           FROM tipp_Teams t1, tipp_Teams t2
           WHERE t1.GroupName = @group
             AND t2.GroupName = @group
             AND t1.Id = (SELECT MIN(Id) FROM tipp_Teams WHERE GroupName = @group) + @homeIdx
             AND t2.Id = (SELECT MIN(Id) FROM tipp_Teams WHERE GroupName = @group) + @awayIdx
         `);
    }
  }
}

export async function dropTestDatabase(dbName: string): Promise<void> {
  const masterConfig: sql.config = {
    server: process.env.DB_SERVER || "localhost",
    port: parseInt(process.env.DB_PORT || "1433"),
    database: "master",
    user: process.env.DB_USER || "lportal",
    password: process.env.DB_PASSWORD || "lportal",
    options: { encrypt: true, trustServerCertificate: true },
  };

  try {
    const pool = await sql.connect(masterConfig);
    await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.databases WHERE name = '${dbName}')
      BEGIN
        ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        DROP DATABASE [${dbName}];
      END
    `);
  } catch (err) {
    console.error("Failed to drop test database:", err);
  }
}
