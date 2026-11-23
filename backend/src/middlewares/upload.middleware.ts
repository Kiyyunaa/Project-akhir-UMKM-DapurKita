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
      callback(new Error("Format file harus JPG, JPEG, PNG, atau WEBP."));
    }
  },
});

export default upload;
