import { type NextFunction, type Request, type Response } from "express";

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

// Custom error classes for consistent error handling
export class BadRequestError extends Error implements ApiError {
  public statusCode: number;
  public code: string;

  constructor(message: string, code = "BAD_REQUEST") {
    super(message);
    this.statusCode = 400;
    this.code = code;
  }
}

export class UnauthorizedError extends Error implements ApiError {
  public statusCode: number;
  public code: string;

  constructor(message: string = "Unauthorized", code = "UNAUTHORIZED") {
    super(message);
    this.statusCode = 401;
    this.code = code;
  }
}

export class ForbiddenError extends Error implements ApiError {
  public statusCode: number;
  public code: string;

  constructor(message: string = "Forbidden", code = "FORBIDDEN") {
    super(message);
    this.statusCode = 403;
    this.code = code;
  }
}

export class NotFoundError extends Error implements ApiError {
  public statusCode: number;
  public code: string;

  constructor(message: string = "Not Found", code = "NOT_FOUND") {
    super(message);
    this.statusCode = 404;
    this.code = code;
  }
}

export class ConflictError extends Error implements ApiError {
  public statusCode: number;
  public code: string;

  constructor(message: string = "Conflict", code = "CONFLICT") {
    super(message);
    this.statusCode = 409;
    this.code = code;
  }
}

export class ValidationError extends Error implements ApiError {
  public statusCode: number;
  public code: string;

  constructor(message: string = "Validation Error", code = "VALIDATION_ERROR") {
    super(message);
    this.statusCode = 422;
    this.code = code;
  }
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
  
  // Default to 500 if no status code is set
  const statusCode = err.statusCode || 500;
  
  // Standardized error response format
  res.status(statusCode).json({
    error: {
      message: err.message || "Internal server error",
      code: err.code || "INTERNAL_ERROR",
      statusCode
    }
  });
};