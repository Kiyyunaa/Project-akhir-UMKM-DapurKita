import { z } from "zod";

export const createProductSchema = z.object({
  category_id: z.coerce.number().int().positive("Kategori harus dipilih"),
  name: z.string().min(2, "Nama produk minimal 2 karakter"),
  description: z.string().optional(),
  capital_price: z.coerce.number().min(0, "Harga modal minimal 0"),
  selling_price: z.coerce.number().min(0, "Harga jual minimal 0"),
  stock: z.coerce.number().int().min(0, "Stok minimal 0").default(0),
  is_available: z.preprocess((val) => {
    if (typeof val === "string") return val === "true" || val === "1";
    return Boolean(val);
  }, z.boolean()).optional().default(true),
});

export const updateProductSchema = z.object({
  category_id: z.coerce.number().int().positive().optional(),
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  capital_price: z.coerce.number().min(0).optional(),
  selling_price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  is_available: z.preprocess((val) => {
    if (typeof val === "string") return val === "true" || val === "1";
    return Boolean(val);
  }, z.boolean()).optional(),
});
