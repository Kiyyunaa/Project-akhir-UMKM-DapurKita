import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../config/jwt";

// Middleware autentikasi token JWT
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Token autentikasi tidak ditemukan. Silakan login terlebih dahulu.",
    });
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Token autentikasi tidak valid.",
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({
      message: "Token tidak valid atau sudah kedaluwarsa.",
    });
  }
}
