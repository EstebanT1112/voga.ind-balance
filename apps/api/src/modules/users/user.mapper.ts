import type { ApiProfile, ProfileRow } from "./user.types.js";

export function mapProfileRow(row: ProfileRow): ApiProfile {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    color: row.color,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
