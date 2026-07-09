import { supabaseAdmin } from "../../lib/supabase.js";
import { mapProfileRow } from "./user.mapper.js";
import type { ApiProfile, ProfileRow, UserListFilters } from "./user.types.js";

const profileSelect = "id, role, full_name, color, active, created_at, updated_at";

export const usersRepository = {
  async list(filters: UserListFilters): Promise<ApiProfile[]> {
    let query = supabaseAdmin.from("profiles").select(profileSelect).order("full_name", {
      ascending: true,
    });

    if (filters.role) {
      query = query.eq("role", filters.role);
    }

    if (filters.active !== undefined) {
      query = query.eq("active", filters.active);
    }

    const { data, error } = await query.returns<ProfileRow[]>();

    if (error) {
      throw error;
    }

    return data.map(mapProfileRow);
  },

  async findProfileById(id: string): Promise<ApiProfile | null> {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(profileSelect)
      .eq("id", id)
      .maybeSingle<ProfileRow>();

    if (error) {
      throw error;
    }

    return data ? mapProfileRow(data) : null;
  },
};
