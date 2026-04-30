import { type Request, type Response, type NextFunction } from "express";
import { type ZodType, type ZodError } from "zod";

export interface ValidatedRequest<T = unknown> extends Request {
  validated?: T;
}

export function validate<T>(schema: ZodType<T>) {
  return (req: ValidatedRequest<T>, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const error = result.error as ZodError;
      return res.status(400).json({ error: error.message });
    }
    req.validated = result.data;
    next();
  };
}
