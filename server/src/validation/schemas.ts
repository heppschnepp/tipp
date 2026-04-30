import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username too long"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const predictionSchema = z.object({
  matchKey: z.string().min(1, "MatchKey is required"),
  homeScore: z.preprocess((val): number | null => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().int().min(0, "Home score cannot be negative").nullable().optional()),
  awayScore: z.preprocess((val): number | null => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().int().min(0, "Away score cannot be negative").nullable().optional()),
});

export const resetPasswordSchema = z.object({
  userId: z.preprocess(
    (val) => Number(val),
    z.number().int().positive("User ID must be positive"),
  ),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const simulationSchema = z.object({
  playerCount: z.preprocess(
    (val) => Number(val),
    z
      .number()
      .int()
      .min(1, "Player count must be at least 1")
      .max(100, "Player count too high")
      .optional(),
  ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PredictionInput = z.infer<typeof predictionSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SimulationInput = z.infer<typeof simulationSchema>;
