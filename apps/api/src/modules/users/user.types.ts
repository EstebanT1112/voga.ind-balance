export type ApiRole = "owner" | "seller";

export interface ApiProfile {
  id: string;
  role: ApiRole;
  fullName: string;
  color: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileRow {
  id: string;
  role: ApiRole;
  full_name: string;
  color: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserListFilters {
  role?: ApiRole;
  active?: boolean;
}
