import { createTestDatabase } from "./db-utils.js";
import dotenv from "dotenv";

dotenv.config();

export default async function globalSetup(): Promise<void> {
  const dbName = await createTestDatabase();
  process.env.TEST_DB_NAME = dbName;
  process.env.DB_NAME = dbName;

  // Re-export dbName for tests
  console.log(`Test database created: ${dbName}`);
}
