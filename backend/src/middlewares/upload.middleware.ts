import multer from "multer";

// Simpan file sementara di memory sebelum dikirim ke Cloudinary
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Maksimal 5MB
  fileFilter: (_req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      // Beri status 400 supaya Flutter menerima pesan ini, bukan error 500 umum.
      const error = new Error("Format file harus JPG, JPEG, PNG, atau WEBP.") as Error & {
        status: number;
      };
      error.status = 400;
      callback(error);
    }
  },
});

export default upload;
