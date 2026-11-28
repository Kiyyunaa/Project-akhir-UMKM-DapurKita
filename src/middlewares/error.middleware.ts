import type { Request, Response, NextFunction } from "express";
import multer from "multer";

// Middleware penanganan error global
export function errorMiddleware(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("Terjadi error:", err);

  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || "Terjadi kesalahan pada server.";

  // Error upload dari Multer
  if (err instanceof multer.MulterError) {
    statusCode = 400;

    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Ukuran gambar maksimal 5 MB.";
    } else {
      message = "Terjadi kesalahan saat mengunggah gambar.";
    }
  }

  // Error format gambar dari fileFilter
  if (
    err.message === "Format file harus JPG, JPEG, PNG, atau WEBP."
  ) {
    statusCode = 400;
    message = err.message;
  }

  return res.status(statusCode).json({
    message,
  });
}
