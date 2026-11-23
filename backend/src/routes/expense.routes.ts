import { Router } from "express";
import {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/expense.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/role.middleware";
import { validateMiddleware } from "../middlewares/validate.middleware";
import { expenseSchema, updateExpenseSchema } from "../validations/expense.validation";

const router = Router();

// Khusus Admin
router.use(authMiddleware, adminMiddleware);

router.get("/", getAllExpenses);
router.get("/:id", getExpenseById);
router.post("/", validateMiddleware(expenseSchema), createExpense);
router.put("/:id", validateMiddleware(updateExpenseSchema), updateExpense);
router.delete("/:id", deleteExpense);

export default router;
