import { type NextFunction, type Request, type Response } from "express";

export interface ApiError extends Error {
  statusCode?: number;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  console.error(err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ error: err.message || "Internal server error" });
};
