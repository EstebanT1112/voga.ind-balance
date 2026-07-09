import { z } from "zod";

const PAYMENT_KINDS = ["initial", "later"] as const;

const uuidSchema = z.string().uuid();

export const paymentIdParamsSchema = z.object({
  id: uuidSchema,
});

export const listPaymentsQuerySchema = z.object({
  saleId: uuidSchema.optional(),
  registeredBy: uuidSchema.optional(),
  kind: z.enum(PAYMENT_KINDS).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const registerPaymentSchema = z.object({
  saleId: uuidSchema,
  amount: z.number().int().positive(),
  paidAt: z.string().datetime().optional(),
  note: z.string().trim().min(1).nullable().optional(),
});
