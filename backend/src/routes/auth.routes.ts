import { Router } from "express";
import { register, login, getProfile, updateProfile } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateMiddleware } from "../middlewares/validate.middleware";
import { registerSchema, loginSchema } from "../validations/auth.validation";

const router = Router();

router.post("/register", validateMiddleware(registerSchema), register);
router.post("/login", validateMiddleware(loginSchema), login);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

export default router;
