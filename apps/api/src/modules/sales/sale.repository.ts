import { supabaseAdmin } from "../../lib/supabase.js";
import type {
  CreateSaleData,
  SaleItemRow,
  SaleListFilters,
  SaleRow,
  SaleWithItemsRow,
  SellerDashboardData,
  SellerDashboardFilters,
  SellerDashboardMovementRow,
  SellerDashboardReturnRow,
  SellerDashboardSaleRow,
} from "./sale.types.js";
import { withItems } from "./sale.mapper.js";

const saleSelect =
  "id, seller_id, buyer_full_name, buyer_phone, sale_date, due_date, return_deadline, total_amount, total_purchase_cost, paid_amount, pending_amount, payment_status, return_status, admin_status, created_by, created_at, updated_at";

const saleItemSelect =
  "id, sale_id, product_id, product_name, product_size, product_category, product_subcategory, purchase_price, sale_price, status, returned_at, created_at";

async function listItemsBySaleIds(saleIds: string[]): Promise<SaleItemRow[]> {
  if (saleIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("sale_items")
    .select(saleItemSelect)
    .in("sale_id", saleIds)
    .order("created_at", { ascending: true })
    .returns<SaleItemRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

function attachItems(sales: SaleRow[], items: SaleItemRow[]): SaleWithItemsRow[] {
  const itemsBySale = new Map<string, SaleItemRow[]>();

  for (const item of items) {
    const current = itemsBySale.get(item.sale_id) ?? [];
    current.push(item);
    itemsBySale.set(item.sale_id, current);
  }

  return sales.map((sale) => withItems(sale, itemsBySale.get(sale.id) ?? []));
}

export const saleRepository = {
  async getSellerDashboardData(sellerId: string, filters: SellerDashboardFilters): Promise<SellerDashboardData> {
    const salesQuery = supabaseAdmin
      .from("sales")
      .select("sale_date, total_amount, pending_amount")
      .eq("seller_id", sellerId)
      .eq("admin_status", "active")
      .gte("sale_date", filters.chartFrom)
      .lte("sale_date", filters.to);
    const paymentsQuery = supabaseAdmin
      .from("payments")
      .select("amount, sales!inner(seller_id, admin_status)")
      .eq("sales.seller_id", sellerId)
      .eq("sales.admin_status", "active")
      .gte("paid_at", filters.from)
      .lte("paid_at", filters.to);
    const returnsQuery = supabaseAdmin
      .from("returns")
      .select("refund_amount, sales!inner(seller_id, admin_status)")
      .eq("sales.seller_id", sellerId)
      .eq("sales.admin_status", "active")
      .gte("returned_at", filters.from)
      .lte("returned_at", filters.to);

    const [salesResult, paymentsResult, returnsResult] = await Promise.all([
      salesQuery.returns<SellerDashboardSaleRow[]>(),
      paymentsQuery.returns<SellerDashboardMovementRow[]>(),
      returnsQuery.returns<SellerDashboardReturnRow[]>(),
    ]);
    const error = salesResult.error ?? paymentsResult.error ?? returnsResult.error;

    if (error) {
      throw error;
    }

    return {
      payments: paymentsResult.data ?? [],
      returns: returnsResult.data ?? [],
      sales: salesResult.data ?? [],
    };
  },

  async list(filters: SaleListFilters): Promise<SaleWithItemsRow[]> {
    let query = supabaseAdmin.from("sales").select(saleSelect).order("sale_date", {
      ascending: false,
    });

    if (filters.sellerId) {
      query = query.eq("seller_id", filters.sellerId);
    }

    if (filters.paymentStatus) {
      query = query.eq("payment_status", filters.paymentStatus);
    }

    if (filters.returnStatus) {
      query = query.eq("return_status", filters.returnStatus);
    }

    if (filters.adminStatus) {
      query = query.eq("admin_status", filters.adminStatus);
    }

    if (filters.from) {
      query = query.gte("sale_date", filters.from);
    }

    if (filters.to) {
      query = query.lte("sale_date", filters.to);
    }

    const { data: sales, error } = await query.returns<SaleRow[]>();

    if (error) {
      throw error;
    }

    const items = await listItemsBySaleIds(sales.map((sale) => sale.id));
    return attachItems(sales, items);
  },

  async findById(id: string): Promise<SaleWithItemsRow | null> {
    const { data: sale, error } = await supabaseAdmin
      .from("sales")
      .select(saleSelect)
      .eq("id", id)
      .maybeSingle<SaleRow>();

    if (error) {
      throw error;
    }

    if (!sale) {
      return null;
    }

    const items = await listItemsBySaleIds([sale.id]);
    return withItems(sale, items);
  },

  async createAtomic(data: CreateSaleData, sellerId: string, createdBy: string): Promise<string> {
    const { data: saleId, error } = await supabaseAdmin.rpc("create_sale_atomic", {
      p_seller_id: sellerId,
      p_created_by: createdBy,
      p_buyer_full_name: data.buyerFullName,
      p_buyer_phone: data.buyerPhone,
      p_product_ids: data.productIds,
      p_initial_payment_amount: data.initialPaymentAmount,
      p_sale_date: data.saleDate ?? new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    return saleId as string;
  },
};
