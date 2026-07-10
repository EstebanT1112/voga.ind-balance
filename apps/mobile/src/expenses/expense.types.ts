export interface Expense {
  id: string;
  createdBy: string;
  category: string;
  description: string;
  amount: number;
  spentAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensesResponse {
  items: Expense[];
  next: string | null;
}

export interface CreateExpenseInput {
  category: string;
  description: string;
  amount: number;
  note?: string | null;
  spentAt?: string;
}
