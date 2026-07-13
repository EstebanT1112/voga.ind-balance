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

export const PRODUCT_EXPENSE_CATEGORY = "Productos";
export const PRODUCT_EXPENSE_NOTE = "Generado automaticamente al cargar producto";

export function isProductExpense(expense: Pick<ExpenseRow, "category" | "note">): boolean {
  return expense.category === PRODUCT_EXPENSE_CATEGORY && expense.note === PRODUCT_EXPENSE_NOTE;
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
  isProductExpense: boolean;
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
