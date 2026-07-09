import { z } from "zod";

const nonEmptyStringSchema = z.string().trim().min(1);

export const expenseIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listExpensesQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const createExpenseSchema = z.object({
  category: nonEmptyStringSchema,
  description: nonEmptyStringSchema,
  amount: z.number().int().positive(),
  spentAt: z.string().datetime().optional(),
  note: z.string().trim().min(1).nullable().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field is required",
  },
);
