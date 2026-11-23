import { Router } from "express";
import { getAllUsers, getUserById } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/role.middleware";

const router = Router();

// Khusus Admin
router.use(authMiddleware, adminMiddleware);

router.get("/", getAllUsers);
router.get("/:id", getUserById);

export default router;
