import { Router } from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/role.middleware";
import { upload } from "../middlewares/upload.middleware";
import { validateMiddleware } from "../middlewares/validate.middleware";
import { createProductSchema, updateProductSchema } from "../validations/product.validation";

const router = Router();

// Endpoint publik
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// Endpoint khusus Admin
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  validateMiddleware(createProductSchema),
  createProduct
);

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  validateMiddleware(updateProductSchema),
  updateProduct
);

router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

export default router;
