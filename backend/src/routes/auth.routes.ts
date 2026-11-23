import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, logout, getProfile, updateProfile, updateProfileImage } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateMiddleware } from "../middlewares/validate.middleware";
import { upload } from "../middlewares/upload.middleware";
import { registerSchema, loginSchema } from "../validations/auth.validation";
import { updateProfileSchema } from "../validations/user.validation";

const router = Router();

// Batasi percobaan login/register agar tidak bisa brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Terlalu banyak percobaan. Silakan coba lagi setelah 15 menit." },
});

router.post("/register", authLimiter, validateMiddleware(registerSchema), register);
router.post("/login", authLimiter, validateMiddleware(loginSchema), login);
router.post("/logout", authMiddleware, logout);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, validateMiddleware(updateProfileSchema), updateProfile);
router.put("/profile/image", authMiddleware, upload.single("image"), updateProfileImage);

export default router;
