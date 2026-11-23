import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../config/jwt";
import db from "../database/database";

// Middleware autentikasi token JWT
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
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

  let decoded: JwtPayload;
  try {
    decoded = verifyToken(token);
  } catch {
    return res.status(401).json({
      message: "Token tidak valid atau sudah kedaluwarsa.",
    });
  }

  // Pastikan akun masih ada dan aktif di database
  const [users]: any = await db.execute(
    "SELECT aktif, token_version FROM pengguna WHERE id = ? LIMIT 1",
    [decoded.id]
  );

  if (users.length === 0 || !users[0].aktif) {
    return res.status(401).json({
      message: "Akun tidak ditemukan atau sudah dinonaktifkan.",
    });
  }

  // Token lama otomatis tidak berlaku setelah logout (token_version naik)
  if ((decoded.token_version ?? 0) !== Number(users[0].token_version ?? 0)) {
    return res.status(401).json({
      message: "Token sudah tidak berlaku. Silakan login lagi.",
    });
  }

  req.user = decoded;
  return next();
}
