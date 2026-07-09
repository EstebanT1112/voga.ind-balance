export const USER_ROLES = ["owner", "seller"] as const;

export const USER_ROLE_LABELS = {
  owner: "Dueña",
  seller: "Empleada",
} as const satisfies Record<UserRole, string>;

export type UserRole = (typeof USER_ROLES)[number];
