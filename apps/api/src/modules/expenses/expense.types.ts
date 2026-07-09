export interface ExpenseRow {
  id: string;
  created_by: string;
  category: string;
  description: string;
  amount: number;
  spent_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiExpense {
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

export interface ExpenseListFilters {
  category?: string;
  from?: string;
  to?: string;
}

export interface CreateExpenseData {
  category: string;
  description: string;
  amount: number;
  spentAt?: string;
  note?: string | null;
}

export type UpdateExpenseData = Partial<CreateExpenseData>;
