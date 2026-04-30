import { Router } from "express";
import { validate } from "../validation/validate.js";
import { predictionSchema } from "../validation/schemas.js";
import {
  getUserPredictions,
  savePrediction,
  deletePrediction,
} from "../controllers/predictions.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router: ReturnType<typeof Router> = Router();

router.use(asyncHandler(authMiddleware));
router.get("/", asyncHandler(getUserPredictions));
router.post("/", validate(predictionSchema), asyncHandler(savePrediction));
router.delete("/:matchKey", asyncHandler(deletePrediction));

export { router as predictionsRouter };
