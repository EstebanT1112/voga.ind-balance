import { supabaseAdmin } from "../../lib/supabase.js";
import { toExpenseInsert, toExpenseUpdate } from "./expense.mapper.js";
import type { CreateExpenseData, ExpenseListFilters, ExpenseRow, UpdateExpenseData } from "./expense.types.js";

const expenseSelect =
  "id, created_by, category, description, amount, spent_at, note, created_at, updated_at";

export const expenseRepository = {
  async list(filters: ExpenseListFilters): Promise<ExpenseRow[]> {
    let query = supabaseAdmin.from("expenses").select(expenseSelect).order("spent_at", {
      ascending: false,
    });

    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    if (filters.from) {
      query = query.gte("spent_at", filters.from);
    }

    if (filters.to) {
      query = query.lte("spent_at", filters.to);
    }

    const { data, error } = await query.returns<ExpenseRow[]>();

    if (error) {
      throw error;
    }

    return data;
  },

  async findById(id: string): Promise<ExpenseRow | null> {
    const { data, error } = await supabaseAdmin
      .from("expenses")
      .select(expenseSelect)
      .eq("id", id)
      .maybeSingle<ExpenseRow>();

    if (error) {
      throw error;
    }

    return data;
  },

  async create(data: CreateExpenseData, createdBy: string): Promise<ExpenseRow> {
    const { data: expense, error } = await supabaseAdmin
      .from("expenses")
      .insert(toExpenseInsert(data, createdBy))
      .select(expenseSelect)
      .single<ExpenseRow>();

    if (error) {
      throw error;
    }

    return expense;
  },

  async update(id: string, data: UpdateExpenseData): Promise<ExpenseRow | null> {
    const { data: expense, error } = await supabaseAdmin
      .from("expenses")
      .update(toExpenseUpdate(data))
      .eq("id", id)
      .select(expenseSelect)
      .maybeSingle<ExpenseRow>();

    if (error) {
      throw error;
    }

    return expense;
  },

  async delete(id: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin.from("expenses").delete().eq("id", id).select("id");

    if (error) {
      throw error;
    }

    return data.length > 0;
  },
};
