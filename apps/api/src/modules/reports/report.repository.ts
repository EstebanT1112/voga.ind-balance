import { supabaseAdmin } from "../../lib/supabase.js";
import type {
  ConfirmedSaleItemReportRow,
  ExpenseReportRow,
  PaymentReportRow,
  ReportData,
  ReportFilters,
  ReturnReportRow,
  SaleReportRow,
  SellerProfileReportRow,
} from "./report.types.js";

function applyDateRange<T>(
  query: T,
  column: string,
  filters: ReportFilters,
): T {
  let nextQuery = query as {
    gte(column: string, value: string): typeof nextQuery;
    lte(column: string, value: string): typeof nextQuery;
  };

  if (filters.from) {
    nextQuery = nextQuery.gte(column, filters.from);
  }

  if (filters.to) {
    nextQuery = nextQuery.lte(column, filters.to);
  }

  return nextQuery as T;
}

export const reportRepository = {
  async getData(filters: ReportFilters): Promise<ReportData> {
    const confirmedItemsQuery = applyDateRange(
      supabaseAdmin
        .from("confirmed_sale_items_view")
        .select(
          "sale_id, seller_id, sale_date, product_id, product_name, product_size, product_category, product_subcategory, purchase_price, sale_price",
        ),
      "sale_date",
      filters,
    );

    const salesQuery = applyDateRange(
      supabaseAdmin
        .from("sales")
        .select("id, seller_id, sale_date, total_amount, total_purchase_cost, paid_amount, pending_amount, admin_status")
        .eq("admin_status", "active"),
      "sale_date",
      filters,
    );

    const paymentsQuery = applyDateRange(
      supabaseAdmin.from("payments").select("id, sale_id, amount, paid_at"),
      "paid_at",
      filters,
    );

    const returnsQuery = applyDateRange(
      supabaseAdmin.from("returns").select("id, sale_id, refund_amount, returned_at"),
      "returned_at",
      filters,
    );

    const expensesQuery = applyDateRange(
      supabaseAdmin.from("expenses").select("id, category, amount, spent_at"),
      "spent_at",
      filters,
    );

    const sellersQuery = supabaseAdmin.from("profiles").select("id, role");

    const [
      confirmedItemsResult,
      salesResult,
      paymentsResult,
      returnsResult,
      expensesResult,
      sellersResult,
    ] = await Promise.all([
      confirmedItemsQuery.returns<ConfirmedSaleItemReportRow[]>(),
      salesQuery.returns<SaleReportRow[]>(),
      paymentsQuery.returns<PaymentReportRow[]>(),
      returnsQuery.returns<ReturnReportRow[]>(),
      expensesQuery.returns<ExpenseReportRow[]>(),
      sellersQuery.returns<SellerProfileReportRow[]>(),
    ]);

    const firstError =
      confirmedItemsResult.error ??
      salesResult.error ??
      paymentsResult.error ??
      returnsResult.error ??
      expensesResult.error ??
      sellersResult.error;

    if (firstError) {
      throw firstError;
    }

    return {
      confirmedItems: confirmedItemsResult.data ?? [],
      sales: salesResult.data ?? [],
      payments: paymentsResult.data ?? [],
      returns: returnsResult.data ?? [],
      expenses: expensesResult.data ?? [],
      sellers: sellersResult.data ?? [],
    };
  },
};
