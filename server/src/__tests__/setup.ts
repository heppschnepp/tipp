import dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

export function getTestDbConfig(): sql.config {
  const dbName = process.env.TEST_DB_NAME || process.env.DB_NAME || "tipp";
  return {
    server: process.env.DB_SERVER || "localhost",
    port: parseInt(process.env.DB_PORT || "1433"),
    database: dbName,
    user: process.env.DB_USER || "lportal",
    password: process.env.DB_PASSWORD || "lportal",
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };
}

export function overrideDbConfig(): void {
  const testDbName = process.env.TEST_DB_NAME;
  if (testDbName) {
    process.env.DB_NAME = testDbName;
  }
}
