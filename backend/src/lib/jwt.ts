import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config.js";

export interface JwtPayload {
  userId?: string;
  adminId?: string;
  email: string;
  role: "user" | "admin";
}

export function signUserToken(userId: string, email: string): string {
  const options: SignOptions = { expiresIn: config.jwt.expiresIn as SignOptions["expiresIn"] };
  return jwt.sign({ userId, email, role: "user" }, config.jwt.secret, options);
}

export function signAdminToken(adminId: string, email: string): string {
  const options: SignOptions = { expiresIn: config.jwt.expiresIn as SignOptions["expiresIn"] };
  return jwt.sign({ adminId, email, role: "admin" }, config.jwt.secret, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}
