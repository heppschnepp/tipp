import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

async function dropTestDatabase(dbName: string): Promise<void> {
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

process.on("exit", async () => {
  const dbName = process.env.TEST_DB_NAME;
  if (dbName) {
    await dropTestDatabase(dbName);
  }
});

process.on("unhandledRejection", async (reason) => {
  console.error("Unhandled Rejection:", reason);
  const dbName = process.env.TEST_DB_NAME;
  if (dbName) {
    await dropTestDatabase(dbName);
  }
  process.exit(1);
});

process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception:", err);
  const dbName = process.env.TEST_DB_NAME;
  if (dbName) {
    await dropTestDatabase(dbName);
  }
  process.exit(1);
});

export default async function globalTeardown(): Promise<void> {
  const dbName = process.env.TEST_DB_NAME;
  if (dbName) {
    await dropTestDatabase(dbName);
    console.log("Test database cleaned up");
  }
}
