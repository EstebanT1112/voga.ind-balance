import { z } from "zod";

const uuidSchema = z.string().uuid();

export const returnIdParamsSchema = z.object({
  id: uuidSchema,
});

export const listReturnsQuerySchema = z.object({
  saleId: uuidSchema.optional(),
  registeredBy: uuidSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const registerReturnSchema = z.object({
  saleId: uuidSchema,
  saleItemIds: z.array(uuidSchema).min(1),
  reason: z.string().trim().min(1).nullable().optional(),
  returnedAt: z.string().datetime().optional(),
});
