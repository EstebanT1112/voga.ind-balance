export interface ReportSummary {
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
  topCategories: Array<{
    key: string;
    quantity: number;
    amount: number;
  }>;
  topSubcategories: Array<{
    key: string;
    quantity: number;
    amount: number;
  }>;
  topSizes: Array<{
    key: string;
    quantity: number;
    amount: number;
  }>;
  topProducts: Array<{
    key: string;
    quantity: number;
    amount: number;
  }>;
  expensesByCategory: Array<{
    category: string;
    amount: number;
  }>;
  commissionsBySeller: Array<{
    sellerId: string;
    collectedAmount: number;
    commissionAmount: number;
  }>;
}

export interface ApiProfile {
  id: string;
  role: "owner" | "seller";
  fullName: string;
  color: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  items: ApiProfile[];
  next: string | null;
}
