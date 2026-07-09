import type { ApiExpense, CreateExpenseData, ExpenseRow, UpdateExpenseData } from "./expense.types.js";

export function mapExpenseRow(row: ExpenseRow): ApiExpense {
  return {
    id: row.id,
    createdBy: row.created_by,
    category: row.category,
    description: row.description,
    amount: row.amount,
    spentAt: row.spent_at,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toExpenseInsert(data: CreateExpenseData, createdBy: string) {
  return {
    created_by: createdBy,
    category: data.category.trim(),
    description: data.description.trim(),
    amount: data.amount,
    spent_at: data.spentAt ?? new Date().toISOString(),
    note: data.note?.trim() || null,
  };
}

export function toExpenseUpdate(data: UpdateExpenseData) {
  return {
    ...(data.category !== undefined ? { category: data.category.trim() } : {}),
    ...(data.description !== undefined ? { description: data.description.trim() } : {}),
    ...(data.amount !== undefined ? { amount: data.amount } : {}),
    ...(data.spentAt !== undefined ? { spent_at: data.spentAt } : {}),
    ...(data.note !== undefined ? { note: data.note?.trim() || null } : {}),
  };
}
