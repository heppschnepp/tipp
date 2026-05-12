import { Router } from "express";
import { validate } from "../validation/validate.js";
import { resetPasswordSchema, simulationSchema } from "../validation/schemas.js";
import {
  resetPassword,
  simulate,
  cleanupSimulation,
  getSimulationStatus,
  seedData,
  getUsers,
  getLiveResults,
} from "../controllers/admin.controller.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router: ReturnType<typeof Router> = Router();

router.use(asyncHandler(authMiddleware));
router.use(asyncHandler(adminMiddleware));
router.post("/reset-password", validate(resetPasswordSchema), asyncHandler(resetPassword));
router.post("/simulate", validate(simulationSchema), asyncHandler(simulate));
router.post("/cleanup-simulation", asyncHandler(cleanupSimulation));
router.get("/simulate/status", asyncHandler(getSimulationStatus));
router.post("/seed", asyncHandler(seedData));
router.get("/users", asyncHandler(getUsers));
router.get("/live-results", asyncHandler(getLiveResults));

export const adminRouter: ReturnType<typeof Router> = router;
