import type { Request, Response, NextFunction } from "express";

// Middleware penanganan error global
export function errorMiddleware(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("Terjadi error:", err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Terjadi kesalahan pada server.";

  return res.status(statusCode).json({
    message,
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
}
