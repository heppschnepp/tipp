import jwt from "jsonwebtoken";
import { type Request, type Response, type NextFunction } from "express";

export interface UserInfo {
  userId: number;
  username: string;
  isAdmin: boolean;
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const JWT_SECRET = process.env.JWT_SECRET || "default-secret";
    const decoded = jwt.verify(token, JWT_SECRET) as UserInfo;
    (req as { user?: UserInfo }).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!(req as { user?: { isAdmin: boolean } }).user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};
