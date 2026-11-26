import { z } from "zod";

export const updatePaymentStatusSchema = z.object({
  payment_status: z.enum(["unpaid", "paid", "failed"]),
});
