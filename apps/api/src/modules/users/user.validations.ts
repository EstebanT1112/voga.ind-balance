import { z } from "zod";

const ROLES = ["owner", "seller"] as const;

export const listUsersQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});
