import { z } from "zod";

const PAYMENT_STATUSES = ["paid", "partial", "unpaid", "overdue"] as const;
const RETURN_STATUSES = ["return_window", "confirmed", "with_return"] as const;
const SALE_ADMIN_STATUSES = ["active", "voided"] as const;

const uuidSchema = z.string().uuid();
const nonEmptyStringSchema = z.string().trim().min(1);
const moneySchema = z.number().int().nonnegative();

export const saleIdParamsSchema = z.object({
  id: uuidSchema,
});

export const listSalesQuerySchema = z.object({
  sellerId: uuidSchema.optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  returnStatus: z.enum(RETURN_STATUSES).optional(),
  adminStatus: z.enum(SALE_ADMIN_STATUSES).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const sellerDashboardQuerySchema = z.object({
  chartFrom: z.string().datetime(),
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export const createSaleSchema = z.object({
  sellerId: uuidSchema.optional(),
  buyerFullName: nonEmptyStringSchema,
  buyerPhone: nonEmptyStringSchema,
  productIds: z.array(uuidSchema).min(1),
  initialPaymentAmount: moneySchema.default(0),
  saleDate: z.string().datetime().optional(),
});
