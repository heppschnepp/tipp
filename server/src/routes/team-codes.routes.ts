import { Router, type Request, type Response } from "express";
import { TEAM_CODES } from "../data/teamCodes.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router: ReturnType<typeof Router> = Router();

router.get("/", asyncHandler((_req: Request, res: Response) => {
  res.json(TEAM_CODES);
}));

export { router as teamCodesRouter };