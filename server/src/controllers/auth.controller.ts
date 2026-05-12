import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { type Request, type Response } from "express";
import { getDb } from "../db.js";
import type { IdRow, CountRow, UserAuthRow } from "../types/db.js";
import type { RegisterInput, LoginInput } from "../validation/schemas.js";
import { BadRequestError, UnauthorizedError, NotFoundError } from "../middleware/errorHandler.js";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";
const JWT_EXPIRES_IN = 604800; // 7 days in seconds

export const register = async (req: Request<unknown, unknown, RegisterInput>, res: Response) => {
  const { username, password } = req.body;

  const db = await getDb();
  const existing = await db.query<IdRow>(
    "SELECT id FROM tipp_Users WHERE username = $1",
    [username]
  );

  if (existing.rowCount !== null && existing.rowCount > 0) {
    throw new BadRequestError("Username already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const countResult = await db.query<CountRow>("SELECT COUNT(*) as cnt FROM tipp_Users");
  const isFirstUser = countResult.rowCount !== null && countResult.rowCount === 0;

  const result = await db.query<IdRow>(
    "INSERT INTO tipp_Users (username, passwordhash, isadmin) VALUES ($1, $2, $3) RETURNING id",
    [username, passwordHash, isFirstUser ? 1 : 0]
  );

  const userId = result.rows[0].id;
  const secret: jwt.Secret = JWT_SECRET;
  const token = jwt.sign({ userId, username, isAdmin: isFirstUser }, secret, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.json({ token, user: { id: userId, username, isAdmin: isFirstUser } });
};

export const login = async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
  const { username, password } = req.body;

  const db = await getDb();
  const result = await db.query<UserAuthRow>(
    "SELECT id, username, passwordhash, isadmin FROM tipp_Users WHERE username = $1",
    [username]
  );

  if (result.rowCount !== null && result.rowCount === 0) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.passwordhash);
  if (!valid) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const secret: jwt.Secret = JWT_SECRET;
  const token = jwt.sign(
    { userId: user.id, username: user.username, isAdmin: user.isadmin },
    secret,
    { expiresIn: JWT_EXPIRES_IN },
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, isAdmin: user.isadmin },
  });
};

export const getMe = async (req: Request, res: Response) => {
  const userId = (req as { user?: { userId: number } }).user?.userId;
  if (!userId) {
    throw new UnauthorizedError("Not authenticated");
  }

  const db = await getDb();
  const result = await db.query(
    "SELECT id, username, isadmin, createdat FROM tipp_Users WHERE id = $1",
    [userId]
  );

  if (result.rowCount !== null && result.rowCount === 0) {
    throw new NotFoundError("User not found");
  }

  const u = result.rows[0];
  res.json({
    user: {
      id: u.id,
      username: u.username,
      isAdmin: !!u.isadmin,
      createdAt: u.createdat,
    },
  });
};
