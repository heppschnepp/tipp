import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { type Request, type Response } from "express";
import { getDb, sql } from "../db.js";
import type { IdRow, CountRow, UserAuthRow } from "../types/db.js";
import type { RegisterInput, LoginInput } from "../validation/schemas.js";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";
const JWT_EXPIRES_IN = 604800; // 7 days in seconds

export const register = async (req: Request<unknown, unknown, RegisterInput>, res: Response) => {
  const { username, password } = req.body;

  const db = await getDb();
  let request = db.request();
  request.input("username", sql.VarChar, username);
  const existing = await request.query<IdRow>(
    "SELECT Id FROM tipp_Users WHERE Username = @username",
  );

  if (existing.recordset.length > 0) {
    return res.status(400).json({ error: "Username already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isFirstUser =
    (await db.query<CountRow>("SELECT COUNT(*) as cnt FROM tipp_Users"))
      .recordset[0].cnt === 0;

  request = db.request();
  request.input("username", sql.VarChar, username);
  request.input("passwordHash", sql.VarChar, passwordHash);
  request.input("isAdmin", sql.Int, isFirstUser ? 1 : 0);
  const result = await request.query<IdRow>(
    "INSERT INTO tipp_Users (Username, PasswordHash, IsAdmin) OUTPUT INSERTED.Id VALUES (@username, @passwordHash, @isAdmin)",
  );

  const userId = result.recordset[0].Id;
  const secret: jwt.Secret = JWT_SECRET;
  const token = jwt.sign({ userId, username, isAdmin: isFirstUser }, secret, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.json({ token, user: { id: userId, username, isAdmin: isFirstUser } });
};

export const login = async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
  const { username, password } = req.body;

  const db = await getDb();
  const request = db.request();
  request.input("username", sql.VarChar, username);
  const result = await request.query<UserAuthRow>(
    "SELECT * FROM tipp_Users WHERE Username = @username",
  );

  if (result.recordset.length === 0) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = result.recordset[0];
  const valid = await bcrypt.compare(password, user.PasswordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const secret: jwt.Secret = JWT_SECRET;
  const token = jwt.sign(
    { userId: user.Id, username: user.Username, isAdmin: user.IsAdmin },
    secret,
    { expiresIn: JWT_EXPIRES_IN },
  );

  res.json({
    token,
    user: { id: user.Id, username: user.Username, isAdmin: user.IsAdmin },
  });
};

export const getMe = async (req: Request, res: Response) => {
  const userId = (req as { user?: { userId: number } }).user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const db = await getDb();
  const request = db.request();
  request.input("id", sql.Int, userId);
  const result = await db.query(
    "SELECT Id, Username, IsAdmin, CreatedAt FROM tipp_Users WHERE Id = @id",
  );

  if (result.recordset.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  const u = result.recordset[0];
  res.json({
    user: {
      id: u.Id,
      username: u.Username,
      isAdmin: !!u.IsAdmin,
      createdAt: u.CreatedAt,
    },
  });
};
