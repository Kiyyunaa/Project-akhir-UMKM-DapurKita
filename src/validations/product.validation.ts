import { z } from "zod";

const numberField = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }
    return value;
  },
  z.coerce.number()
);

const booleanField = z.preprocess((value) => {
  if (value === "true" || value === "1" || value === 1 || value === true) {
    return true;
  }
  if (value === "false" || value === "0" || value === 0 || value === false) {
    return false;
  }
  return value;
}, z.boolean());

export const createProductSchema = z.object({
  category_id: numberField.pipe(
    z.number().int().positive("Kategori harus dipilih")
 ),

  name: z.string().trim().min(2, "Nama produk minimal 2 karaker"),

  description: z.string().optional(),

  capital_price: numberField.pipe(
    z.number().min(0, "Harga modal minimal 0")
  ),

  selling_price: numberField.pipe(
    z.number().min(0, "Harga jual minimal 0")
  ),

  stock: numberField.pipe(
    z.number().int().min(0, "Stok minimal 0")
  ).default(0),

  is_available: booleanField.optional().default(true),
});

export const updateProductSchema = z.object({
  category_id: numberField.pipe(
    z.number().int().positive("Kategori harus dipilih")
  ).optional(),

  name: z.string().trim().min(2, "Nama produk minimal 2 karakter").optional(),

  description: z.string().optional(),

  capital_price: numberField.pipe(
    z.number().min(0, "Harga modal minimal 0")
  ).optional(),

  selling_price: numberField.pipe(
    z.number().min(0, "Harga jual minimal 0")
  ).optional(),

  stock: numberField.pipe(
    z.number().int().min(0, "Stok minimal 0")
  ).optional(),

  is_available: booleanField.optional(),
});
