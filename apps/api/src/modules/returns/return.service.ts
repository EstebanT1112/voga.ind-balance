import { HttpError } from "../../lib/http-error.js";
import { saleRepository } from "../sales/sale.repository.js";
import type { ApiProfile } from "../users/user.types.js";
import { mapReturnRow } from "./return.mapper.js";
import { returnRepository } from "./return.repository.js";
import type { ApiReturn, RegisterReturnData, ReturnListFilters, ReturnWithItemsRow } from "./return.types.js";

function getSupabaseErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "Could not register return";
}

async function assertCanAccessReturn(returnRow: ReturnWithItemsRow, profile: ApiProfile): Promise<void> {
  if (profile.role === "owner") {
    return;
  }

  const sale = await saleRepository.findById(returnRow.sale_id);

  if (!sale || sale.seller_id !== profile.id) {
    throw new HttpError(404, "not_found", "Return not found");
  }
}

export const returnService = {
  async list(filters: ReturnListFilters, profile: ApiProfile): Promise<ApiReturn[]> {
    const returns = await returnRepository.list(
      filters,
      profile.role === "seller" ? profile.id : undefined,
    );

    return returns.map((returnRow) => mapReturnRow(returnRow, profile.role));
  },

  async getById(id: string, profile: ApiProfile): Promise<ApiReturn> {
    const returnRow = await returnRepository.findById(id);

    if (!returnRow) {
      throw new HttpError(404, "not_found", "Return not found");
    }

    await assertCanAccessReturn(returnRow, profile);
    return mapReturnRow(returnRow, profile.role);
  },

  async register(data: RegisterReturnData, profile: ApiProfile): Promise<ApiReturn> {
    try {
      const returnId = await returnRepository.register(data, profile.id);
      return await this.getById(returnId, profile);
    } catch (error) {
      throw new HttpError(400, "bad_request", getSupabaseErrorMessage(error));
    }
  },
};
