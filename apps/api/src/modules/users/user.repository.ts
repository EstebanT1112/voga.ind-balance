import { supabaseAdmin } from "../../lib/supabase.js";
import { mapProfileRow } from "./user.mapper.js";
import type { ApiProfile, ProfileRow } from "./user.types.js";

export const usersRepository = {
  async findProfileById(id: string): Promise<ApiProfile | null> {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name, color, active, created_at, updated_at")
      .eq("id", id)
      .maybeSingle<ProfileRow>();

    if (error) {
      throw error;
    }

    return data ? mapProfileRow(data) : null;
  },
};
