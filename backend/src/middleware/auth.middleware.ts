import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";
import { AppError } from "../lib/errors.js";

export interface AuthRequest extends Request {
  user?: { userId: string; email: string };
  admin?: { adminId: string; email: string };
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "Authentication required", "UNAUTHORIZED"));
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));
    if (payload.role !== "user" || !payload.userId) {
      next(new AppError(401, "Authentication required", "UNAUTHORIZED"));
      return;
    }
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token", "INVALID_TOKEN"));
  }
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "Admin authentication required", "UNAUTHORIZED"));
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));
    if (payload.role !== "admin" || !payload.adminId) {
      next(new AppError(403, "Admin access required", "FORBIDDEN"));
      return;
    }
    req.admin = { adminId: payload.adminId, email: payload.email };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token", "INVALID_TOKEN"));
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(header.slice(7));
      if (payload.role === "user" && payload.userId) {
        req.user = { userId: payload.userId, email: payload.email };
      }
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
