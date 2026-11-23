import { z } from "zod";

export const expenseSchema = z.object({
  title: z.string().min(2, "Judul pengeluaran minimal 2 karakter"),
  category: z.enum(["raw_material", "packaging", "fuel", "utility", "other"]).default("other"),
  amount: z.coerce.number().positive("Nominal pengeluaran harus lebih dari 0"),
  description: z.string().optional(),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .default(() => new Date().toISOString().split("T")[0]),
});

export const updateExpenseSchema = z.object({
  title: z.string().min(2).optional(),
  category: z.enum(["raw_material", "packaging", "fuel", "utility", "other"]).optional(),
  amount: z.coerce.number().positive().optional(),
  description: z.string().optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
