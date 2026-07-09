import { z } from "zod";

const PRODUCT_STATUSES = ["available", "sold"] as const;
const PRODUCT_CATEGORIES = ["upper", "lower", "lingerie"] as const;

const moneySchema = z.number().int().nonnegative();
const nonEmptyStringSchema = z.string().trim().min(1);

export const productIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listProductsQuerySchema = z.object({
  status: z.enum(PRODUCT_STATUSES).optional(),
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  search: z.string().trim().min(1).optional(),
});

const productPayloadSchema = z.object({
  name: nonEmptyStringSchema,
  photoPath: z.string().trim().min(1).nullable().optional(),
  size: nonEmptyStringSchema,
  description: z.string().trim().nullable().optional(),
  category: z.enum(PRODUCT_CATEGORIES),
  subcategory: z.string().trim().min(1).nullable().optional(),
  purchasePrice: moneySchema,
  salePrice: moneySchema,
});

export const createProductSchema = productPayloadSchema.refine(
  (data) => data.salePrice >= data.purchasePrice,
  {
    message: "salePrice must be greater than or equal to purchasePrice",
    path: ["salePrice"],
  },
);

export const updateProductSchema = productPayloadSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  })
  .refine(
    (data) =>
      data.salePrice === undefined ||
      data.purchasePrice === undefined ||
      data.salePrice >= data.purchasePrice,
    {
      message: "salePrice must be greater than or equal to purchasePrice",
      path: ["salePrice"],
    },
  );
