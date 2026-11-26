import type { Request, Response, NextFunction } from "express";

// Middleware khusus Admin
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      message: "Silakan login terlebih dahulu.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Akses ditolak. Fitur ini hanya dapat diakses oleh Admin.",
    });
  }

  next();
}

// Middleware khusus User
export function userMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      message: "Silakan login terlebih dahulu.",
    });
  }

  if (req.user.role !== "user") {
    return res.status(403).json({
      message: "Akses ditolak. Fitur ini khusus untuk pengguna umum (User).",
    });
  }

  next();
}
