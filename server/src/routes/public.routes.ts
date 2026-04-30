import { Router } from "express";
import {
  getGroups,
  getFlags,
  getKnockoutRounds,
} from "../controllers/groups.controller.js";
import { getLeaderboard } from "../controllers/leaderboard.controller.js";
import { getResults, getFetchStatus } from "../controllers/results.controller.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router: ReturnType<typeof Router> = Router();

router.get("/groups", asyncHandler(getGroups));
router.get("/flags", asyncHandler(getFlags));
router.get("/knockout", asyncHandler(getKnockoutRounds));
router.get("/leaderboard", asyncHandler(getLeaderboard));
router.get("/results", asyncHandler(getResults));
router.get("/results/status", asyncHandler(getFetchStatus));

export { router as publicRouter };
