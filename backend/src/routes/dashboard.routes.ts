import { Router } from "express";
import { getFinancialAnalytics, getSalesChart } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/role.middleware";

const router = Router();

// Khusus Admin
router.use(authMiddleware, adminMiddleware);

router.get("/analytics", getFinancialAnalytics);
router.get("/chart", getSalesChart);

export default router;
