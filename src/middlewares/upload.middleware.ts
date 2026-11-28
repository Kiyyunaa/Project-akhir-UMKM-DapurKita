import multer from "multer";
import path from "path";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      allowedTypes.includes(file.mimetype) &&
      allowedExtensions.includes(extension)
    ) {
      return callback(null, true);
    }

    return callback(
      new Error("Format file harus JPG, JPEG, PNG, atau WEBP.")
    );
  },
});

export default upload;
