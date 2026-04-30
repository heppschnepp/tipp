import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDatabase } from "./db.js";
import { resultScheduler } from "./services/scheduler.js";
import { seedDatabase } from "./services/seed.js";

import { authRouter } from "./routes/auth.routes.js";
import { predictionsRouter } from "./routes/predictions.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { teamCodesRouter } from "./routes/team-codes.routes.js";
import { exportRouter } from "./routes/export.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/predictions", predictionsRouter);
app.use("/api/admin", adminRouter);
app.use("/api", publicRouter);
app.use("/api/team-codes", teamCodesRouter);
app.use("/api", exportRouter);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initDatabase();
    await seedDatabase();
    resultScheduler.start();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start:", err);
    process.exit(1);
  }
}

start();
