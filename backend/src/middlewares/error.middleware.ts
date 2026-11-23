import type { Request, Response, NextFunction } from "express";

// Middleware penanganan error global
export function errorMiddleware(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("Terjadi error:", err);

  // Multer memakai kode LIMIT_FILE_SIZE untuk file > 5MB. Ini kesalahan input
  // user, jadi harus dibalas 400 agar pesannya sampai ke aplikasi.
  const statusCode =
    err.status || err.statusCode || (err.code === "LIMIT_FILE_SIZE" ? 400 : 500);

  if (err.code === "LIMIT_FILE_SIZE") {
    err.message = "Ukuran gambar maksimal 5MB.";
  }

  // Error 500 tidak boleh membocorkan detail query / stack ke client
  const message =
    statusCode >= 500
      ? "Terjadi kesalahan pada server."
      : err.message || "Terjadi kesalahan pada server.";

  return res.status(statusCode).json({ message });
}
