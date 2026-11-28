import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Nama kategori minimal 2 karakter").max(100, "Nama kategori maksimal 100 karakter"),
  description: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2, "Nama kategori minimal 2 karakter").max(100, "Nama kategori maksimal 100 karakter").optional(),
  description: z.string().optional(),
}).refine(
  (data) => data.name !== undefined || data.description !== undefined,
  "Minimal satu data kategori harus diisi."
);
