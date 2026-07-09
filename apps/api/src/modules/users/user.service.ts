import type { ApiProfile, UserListFilters } from "./user.types.js";
import { usersRepository } from "./user.repository.js";

export const userService = {
  async list(filters: UserListFilters): Promise<ApiProfile[]> {
    return usersRepository.list(filters);
  },
};
