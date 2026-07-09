import { HttpError } from "../../lib/http-error.js";
import type { ApiProfile } from "../users/user.types.js";
import { mapSaleRow } from "./sale.mapper.js";
import { saleRepository } from "./sale.repository.js";
import type { ApiSale, CreateSaleData, SaleListFilters, SaleWithItemsRow } from "./sale.types.js";

function assertCanReadSale(sale: SaleWithItemsRow, profile: ApiProfile): void {
  if (profile.role === "seller" && sale.seller_id !== profile.id) {
    throw new HttpError(404, "not_found", "Sale not found");
  }
}

function getSupabaseErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "Could not create sale";
}

function resolveSellerId(data: CreateSaleData, profile: ApiProfile): string {
  if (profile.role === "seller") {
    if (data.sellerId && data.sellerId !== profile.id) {
      throw new HttpError(403, "forbidden", "Sellers can only create their own sales");
    }

    return profile.id;
  }

  return data.sellerId ?? profile.id;
}

export const saleService = {
  async list(filters: SaleListFilters, profile: ApiProfile): Promise<ApiSale[]> {
    const scopedFilters =
      profile.role === "seller"
        ? {
            ...filters,
            sellerId: profile.id,
          }
        : filters;

    const sales = await saleRepository.list(scopedFilters);
    return sales.map((sale) => mapSaleRow(sale, profile.role));
  },

  async getById(id: string, profile: ApiProfile): Promise<ApiSale> {
    const sale = await saleRepository.findById(id);

    if (!sale) {
      throw new HttpError(404, "not_found", "Sale not found");
    }

    assertCanReadSale(sale, profile);
    return mapSaleRow(sale, profile.role);
  },

  async create(data: CreateSaleData, profile: ApiProfile): Promise<ApiSale> {
    const sellerId = resolveSellerId(data, profile);

    try {
      const saleId = await saleRepository.createAtomic(data, sellerId, profile.id);
      return await this.getById(saleId, profile);
    } catch (error) {
      throw new HttpError(400, "bad_request", getSupabaseErrorMessage(error));
    }
  },
};
