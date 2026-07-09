import { HttpError } from "../../lib/http-error.js";
import type { ApiProfile } from "../users/user.types.js";
import { reportRepository } from "./report.repository.js";
import type {
  ApiReport,
  ConfirmedSaleItemReportRow,
  ExpenseReportRow,
  PaymentReportRow,
  RankedReportItem,
  ReportFilters,
  ReturnReportRow,
  SaleReportRow,
  SellerCommissionReportItem,
  SellerProfileReportRow,
} from "./report.types.js";

function assertOwner(profile: ApiProfile): void {
  if (profile.role !== "owner") {
    throw new HttpError(403, "forbidden", "Only owner can read reports");
  }
}

function sumBy<T>(items: T[], getValue: (item: T) => number): number {
  return items.reduce((total, item) => total + getValue(item), 0);
}

function roundMoney(value: number): number {
  return Math.round(value);
}

function rankItems(
  items: ConfirmedSaleItemReportRow[],
  getKey: (item: ConfirmedSaleItemReportRow) => string,
): RankedReportItem[] {
  const byKey = new Map<string, RankedReportItem>();

  for (const item of items) {
    const key = getKey(item);
    const current = byKey.get(key) ?? {
      key,
      quantity: 0,
      amount: 0,
    };

    current.quantity += 1;
    current.amount += item.sale_price;
    byKey.set(key, current);
  }

  return [...byKey.values()].sort((a, b) => b.quantity - a.quantity || b.amount - a.amount);
}

function calculateCollectedProfit(sales: SaleReportRow[]): number {
  return sumBy(sales, (sale) => {
    if (sale.total_amount === 0) {
      return 0;
    }

    const collectedRatio = sale.paid_amount / sale.total_amount;
    const proportionalPurchaseCost = sale.total_purchase_cost * collectedRatio;
    return roundMoney(sale.paid_amount - proportionalPurchaseCost);
  });
}

function calculateCommissions(
  payments: PaymentReportRow[],
  returns: ReturnReportRow[],
  sales: SaleReportRow[],
  sellers: SellerProfileReportRow[],
): SellerCommissionReportItem[] {
  const salesById = new Map(sales.map((sale) => [sale.id, sale]));
  const sellersById = new Map(sellers.map((seller) => [seller.id, seller]));
  const bySeller = new Map<string, SellerCommissionReportItem>();

  const addMovement = (saleId: string, amount: number) => {
    const sale = salesById.get(saleId);

    if (!sale) {
      return;
    }

    const seller = sellersById.get(sale.seller_id);

    if (seller?.role !== "seller") {
      return;
    }

    const current = bySeller.get(sale.seller_id) ?? {
      sellerId: sale.seller_id,
      collectedAmount: 0,
      commissionAmount: 0,
    };

    current.collectedAmount += amount;
    current.commissionAmount = roundMoney(current.collectedAmount * 0.15);
    bySeller.set(sale.seller_id, current);
  };

  for (const payment of payments) {
    addMovement(payment.sale_id, payment.amount);
  }

  for (const returnRow of returns) {
    addMovement(returnRow.sale_id, -returnRow.refund_amount);
  }

  return [...bySeller.values()].sort((a, b) => b.commissionAmount - a.commissionAmount);
}

function groupExpensesByCategory(expenses: ExpenseReportRow[]) {
  const byCategory = new Map<string, number>();

  for (const expense of expenses) {
    byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amount);
  }

  return [...byCategory.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export const reportService = {
  async getSummary(filters: ReportFilters, profile: ApiProfile): Promise<ApiReport> {
    assertOwner(profile);

    const data = await reportRepository.getData(filters);

    const salesAmount = sumBy(data.saleItems, (item) => item.sale_price);
    const collectedAmount = sumBy(data.payments, (payment) => payment.amount);
    const refundedAmount = sumBy(data.returns, (returnRow) => returnRow.refund_amount);
    const netCollectedAmount = collectedAmount - refundedAmount;
    const pendingAmount = sumBy(data.sales, (sale) => sale.pending_amount);
    const collectedProfit = calculateCollectedProfit(data.sales);
    const expensesAmount = sumBy(data.expenses, (expense) => expense.amount);
    const commissionsBySeller = calculateCommissions(
      data.payments,
      data.returns,
      data.sales,
      data.sellers,
    );
    const commissionAmount = sumBy(commissionsBySeller, (commission) => commission.commissionAmount);

    return {
      totals: {
        salesAmount,
        collectedAmount,
        refundedAmount,
        netCollectedAmount,
        pendingAmount,
        collectedProfit,
        expensesAmount,
        commissionAmount,
        netProfitAfterExpenses: collectedProfit - expensesAmount - commissionAmount,
      },
      topCategories: rankItems(data.saleItems, (item) => item.product_category),
      topSubcategories: rankItems(data.saleItems, (item) => item.product_subcategory ?? "Sin clasificar"),
      topSizes: rankItems(data.saleItems, (item) => item.product_size),
      topProducts: rankItems(data.saleItems, (item) => item.product_name),
      expensesByCategory: groupExpensesByCategory(data.expenses),
      commissionsBySeller,
    };
  },
};
