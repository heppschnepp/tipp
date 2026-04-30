import { Router } from "express";
import { validate } from "../validation/validate.js";
import { registerSchema, loginSchema } from "../validation/schemas.js";
import { register, login, getMe } from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router: ReturnType<typeof Router> = Router();

router.post("/register", validate(registerSchema), asyncHandler(register));
router.post("/login", validate(loginSchema), asyncHandler(login));
router.get("/me", asyncHandler(getMe));

export { router as authRouter };
