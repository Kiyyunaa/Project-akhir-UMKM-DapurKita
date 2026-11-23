import { z } from "zod";

export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.coerce.number().int().positive("ID produk harus valid"),
      quantity: z.coerce.number().int().positive("Jumlah pesanan minimal 1"),
    })
  ).min(1, "Pesanan minimal harus ada 1 produk"),
  delivery_address: z.string().min(5, "Alamat pengantaran minimal 5 karakter"),
  notes: z.string().optional(),
  payment_method: z.enum(["cod", "transfer", "qris"]).default("cod"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending","processing","ready_to_deliver","delivering","completed","cancelled"]),
});
