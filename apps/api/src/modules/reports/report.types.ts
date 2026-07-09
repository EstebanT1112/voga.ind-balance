import type { ProductCategory } from "../products/product.types.js";
import type { ApiRole } from "../users/user.types.js";

export interface ReportFilters {
  from?: string;
  to?: string;
}

export interface ConfirmedSaleItemReportRow {
  sale_id: string;
  seller_id: string;
  sale_date: string;
  product_id: string;
  product_name: string;
  product_size: string;
  product_category: ProductCategory;
  product_subcategory: string | null;
  purchase_price: number;
  sale_price: number;
}

export interface SaleReportRow {
  id: string;
  seller_id: string;
  sale_date: string;
  total_amount: number;
  total_purchase_cost: number;
  paid_amount: number;
  pending_amount: number;
  admin_status: "active" | "voided";
}

export interface PaymentReportRow {
  id: string;
  sale_id: string;
  amount: number;
  paid_at: string;
}

export interface ReturnReportRow {
  id: string;
  sale_id: string;
  refund_amount: number;
  returned_at: string;
}

export interface ExpenseReportRow {
  id: string;
  category: string;
  amount: number;
  spent_at: string;
}

export interface SellerProfileReportRow {
  id: string;
  role: ApiRole;
}

export interface ReportData {
  confirmedItems: ConfirmedSaleItemReportRow[];
  sales: SaleReportRow[];
  payments: PaymentReportRow[];
  returns: ReturnReportRow[];
  expenses: ExpenseReportRow[];
  sellers: SellerProfileReportRow[];
}

export interface RankedReportItem {
  key: string;
  quantity: number;
  amount: number;
}

export interface SellerCommissionReportItem {
  sellerId: string;
  collectedAmount: number;
  commissionAmount: number;
}

export interface ExpenseCategoryReportItem {
  category: string;
  amount: number;
}

export interface ApiReport {
  totals: {
    salesAmount: number;
    collectedAmount: number;
    refundedAmount: number;
    netCollectedAmount: number;
    pendingAmount: number;
    collectedProfit: number;
    expensesAmount: number;
    commissionAmount: number;
    netProfitAfterExpenses: number;
  };
  topCategories: RankedReportItem[];
  topSizes: RankedReportItem[];
  expensesByCategory: ExpenseCategoryReportItem[];
  commissionsBySeller: SellerCommissionReportItem[];
}
