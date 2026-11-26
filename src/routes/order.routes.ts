import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/order.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware, userMiddleware } from "../middlewares/role.middleware";
import { validateMiddleware } from "../middlewares/validate.middleware";
import { createOrderSchema, updateOrderStatusSchema } from "../validations/order.validation";

const router = Router();

router.use(authMiddleware);

// User
router.post("/", userMiddleware, validateMiddleware(createOrderSchema), createOrder);
router.get("/my-orders", userMiddleware, getMyOrders);

// Admin
router.get("/", adminMiddleware, getAllOrders);
router.patch("/:id/status", adminMiddleware, validateMiddleware(updateOrderStatusSchema), updateOrderStatus);

// Detail
router.get("/:id", getOrderById);

export default router;
