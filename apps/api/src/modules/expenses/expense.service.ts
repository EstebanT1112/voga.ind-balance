import { HttpError } from "../../lib/http-error.js";
import type { ApiProfile } from "../users/user.types.js";
import { mapExpenseRow } from "./expense.mapper.js";
import { expenseRepository } from "./expense.repository.js";
import { isProductExpense } from "./expense.types.js";
import type { ApiExpense, CreateExpenseData, ExpenseListFilters, UpdateExpenseData } from "./expense.types.js";

function assertOwner(profile: ApiProfile): void {
  if (profile.role !== "owner") {
    throw new HttpError(403, "forbidden", "Only owner can manage expenses");
  }
}

export const expenseService = {
  async list(filters: ExpenseListFilters, profile: ApiProfile): Promise<ApiExpense[]> {
    assertOwner(profile);

    const expenses = await expenseRepository.list(filters);
    return expenses.map(mapExpenseRow);
  },

  async getById(id: string, profile: ApiProfile): Promise<ApiExpense> {
    assertOwner(profile);

    const expense = await expenseRepository.findById(id);

    if (!expense) {
      throw new HttpError(404, "not_found", "Expense not found");
    }

    return mapExpenseRow(expense);
  },

  async create(data: CreateExpenseData, profile: ApiProfile): Promise<ApiExpense> {
    assertOwner(profile);

    const expense = await expenseRepository.create(data, profile.id);
    return mapExpenseRow(expense);
  },

  async update(id: string, data: UpdateExpenseData, profile: ApiProfile): Promise<ApiExpense> {
    assertOwner(profile);

    const current = await expenseRepository.findById(id);

    if (!current) {
      throw new HttpError(404, "not_found", "Expense not found");
    }

    if (isProductExpense(current)) {
      throw new HttpError(409, "bad_request", "Product expenses cannot be modified");
    }

    const expense = await expenseRepository.update(id, data);

    if (!expense) {
      throw new HttpError(404, "not_found", "Expense not found");
    }

    return mapExpenseRow(expense);
  },

  async delete(id: string, profile: ApiProfile): Promise<void> {
    assertOwner(profile);

    const expense = await expenseRepository.findById(id);

    if (!expense) {
      throw new HttpError(404, "not_found", "Expense not found");
    }

    if (isProductExpense(expense)) {
      throw new HttpError(409, "bad_request", "Product expenses cannot be deleted");
    }

    const deleted = await expenseRepository.delete(id);

    if (!deleted) {
      throw new HttpError(404, "not_found", "Expense not found");
    }
  },
};
