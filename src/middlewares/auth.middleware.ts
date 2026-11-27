import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../config/jwt";
import db from "../database/database";

// Middleware autentikasi token JWT
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
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

    // Periksa status dan versi token di database
    const [users]: any = await db.execute(
      `SELECT aktif, token_version
       FROM pengguna
       WHERE id = ?
       LIMIT 1`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Akun tidak ditemukan.",
      });
    }

    const user = users[0];

    if (!user.aktif) {
      return res.status(401).json({
        message: "Akun Anda sudah dinonaktifkan.",
      });
    }

    if (decoded.token_version !== user.token_version) {
      return res.status(401).json({
        message: "Sesi Anda sudah tidak berlaku. Silakan login kembali.",
      });
    }

    req.user = decoded;

    return next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      message: "Token tidak valid atau sudah kedaluwarsa.",
    });
  }
}
