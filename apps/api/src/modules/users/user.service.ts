import { HttpError } from "../../lib/http-error.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import type { ApiProfile, CreateUserData, UpdateUserData, UserListFilters } from "./user.types.js";
import { usersRepository } from "./user.repository.js";

export const userService = {
  async list(filters: UserListFilters): Promise<ApiProfile[]> {
    return usersRepository.list(filters);
  },

  async create(data: CreateUserData): Promise<ApiProfile> {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim(),
      email_confirm: true,
      password: data.password,
      user_metadata: {
        full_name: data.fullName.trim(),
        role: "seller",
      },
    });

    if (authError || !authData.user) {
      throw new HttpError(400, "bad_request", authError?.message ?? "Could not create user");
    }

    try {
      return await usersRepository.createSellerProfile(authData.user.id, data);
    } catch (error) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
      throw error;
    }
  },

  async update(id: string, data: UpdateUserData): Promise<ApiProfile> {
    const profile = await usersRepository.update(id, data);

    if (!profile) {
      throw new HttpError(404, "not_found", "User not found");
    }

    return profile;
  },
};
