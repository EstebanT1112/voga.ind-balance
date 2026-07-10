import { z } from "zod";

const ROLES = ["owner", "seller"] as const;
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

export const createUserSchema = z.object({
  active: z.boolean().optional(),
  color: hexColorSchema.nullable().optional(),
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1),
  password: z.string().min(6),
});

export const updateUserSchema = z
  .object({
    active: z.boolean().optional(),
    color: hexColorSchema.nullable().optional(),
    fullName: z.string().trim().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
