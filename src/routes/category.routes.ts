import { Router } from "express";
import {getAllCategories,getCategoryById,createCategory,updateCategory,deleteCategory,} from "../controllers/category.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/role.middleware";
import { validateMiddleware } from "../middlewares/validate.middleware";
import {categorySchema,updateCategorySchema,} from "../validations/category.validation";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

// Endpoint publik
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// Endpoint khusus Admin
router.post("/",authMiddleware,adminMiddleware,upload.single("image"),validateMiddleware(categorySchema), createCategory);
router.put( "/:id",authMiddleware,adminMiddleware,upload.single("image"),validateMiddleware(updateCategorySchema),updateCategory);
router.delete("/:id", authMiddleware,adminMiddleware,deleteCategory);

export default router;
