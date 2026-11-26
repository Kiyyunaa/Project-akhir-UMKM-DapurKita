import { Router } from "express";
import { getMyNotifications, markAsRead } from "../controllers/notification.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getMyNotifications);
router.patch("/:id/read", markAsRead);

export default router;
