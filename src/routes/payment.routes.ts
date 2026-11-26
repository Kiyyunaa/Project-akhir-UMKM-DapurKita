import { Router } from "express";
import {
  uploadPaymentProof,
  updatePaymentStatus,
  getPaymentByOrderId,
} from "../controllers/payment.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/role.middleware";
import { upload } from "../middlewares/upload.middleware";
import { validateMiddleware } from "../middlewares/validate.middleware";
import { updatePaymentStatusSchema } from "../validations/payment.validation";

const router = Router();

router.use(authMiddleware);

// Upload bukti transfer / QRIS (User)
router.post("/:orderId/proof", upload.single("proof"), uploadPaymentProof);

// Ambil detail data pembayaran
router.get("/:orderId", getPaymentByOrderId);

// Update status pembayaran (Admin)
router.patch(
  "/:orderId/status",
  adminMiddleware,
  validateMiddleware(updatePaymentStatusSchema),
  updatePaymentStatus
);

export default router;
