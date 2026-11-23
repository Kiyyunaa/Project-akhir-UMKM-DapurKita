import { Router } from "express";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/role.middleware";
import { validateMiddleware } from "../middlewares/validate.middleware";
import { categorySchema } from "../validations/category.validation";

const router = Router();

// Endpoint publik
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// Endpoint khusus Admin
router.post("/", authMiddleware, adminMiddleware, validateMiddleware(categorySchema), createCategory);
router.put("/:id", authMiddleware, adminMiddleware, validateMiddleware(categorySchema), updateCategory);
router.delete("/:id", authMiddleware, adminMiddleware, deleteCategory);

export default router;
