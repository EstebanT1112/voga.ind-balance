import { HttpError } from "../../lib/http-error.js";
import type { ApiProfile } from "../users/user.types.js";
import { mapSaleRow } from "./sale.mapper.js";
import { saleRepository } from "./sale.repository.js";
import type {
  ApiSale,
  ApiSellerDashboard,
  CreateSaleData,
  SaleListFilters,
  SaleWithItemsRow,
  SellerDashboardFilters,
} from "./sale.types.js";

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

function getArgentinaMonthKey(value: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";

  return `${year}-${month}`;
}

export const saleService = {
  async getSellerDashboard(filters: SellerDashboardFilters, profile: ApiProfile): Promise<ApiSellerDashboard> {
    if (profile.role !== "seller") {
      throw new HttpError(403, "forbidden", "Only sellers can read their dashboard");
    }

    const data = await saleRepository.getSellerDashboardData(profile.id, filters);
    const currentSales = data.sales.filter((sale) => sale.sale_date >= filters.from);
    const collectedAmount =
      data.payments.reduce((total, payment) => total + payment.amount, 0) -
      data.returns.reduce((total, saleReturn) => total + saleReturn.refund_amount, 0);
    const salesByMonth = new Map<string, number>();

    for (const sale of data.sales) {
      const key = getArgentinaMonthKey(sale.sale_date);
      salesByMonth.set(key, (salesByMonth.get(key) ?? 0) + sale.total_amount);
    }

    return {
      monthlySales: [...salesByMonth.entries()].map(([month, amount]) => ({ amount, month })),
      totals: {
        collectedAmount,
        commissionAmount: Math.round(collectedAmount * 0.15),
        overdueCount: data.overdueCount,
        pendingAmount: currentSales.reduce((total, sale) => total + sale.pending_amount, 0),
        returnWindowCount: data.returnWindowCount,
        saleCount: currentSales.filter((sale) => sale.total_amount > 0).length,
        soldAmount: currentSales.reduce((total, sale) => total + sale.total_amount, 0),
      },
    };
  },

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
