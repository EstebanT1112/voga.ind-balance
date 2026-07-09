import type { Request, RequestHandler } from "express";
import { HttpError } from "../../lib/http-error.js";
import { expenseService } from "./expense.service.js";
import {
  createExpenseSchema,
  expenseIdParamsSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from "./expense.validations.js";

function getProfile(req: Request) {
  if (!req.auth) {
    throw new HttpError(401, "unauthorized", "Authentication required");
  }

  return req.auth.profile;
}

export const listExpenses: RequestHandler = async (req, res, next) => {
  try {
    const filters = listExpensesQuerySchema.parse(req.query);
    const expenses = await expenseService.list(filters, getProfile(req));

    res.json({
      items: expenses,
      next: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseById: RequestHandler = async (req, res, next) => {
  try {
    const { id } = expenseIdParamsSchema.parse(req.params);
    const expense = await expenseService.getById(id, getProfile(req));

    res.json({
      item: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const createExpense: RequestHandler = async (req, res, next) => {
  try {
    const input = createExpenseSchema.parse(req.body);
    const expense = await expenseService.create(input, getProfile(req));

    res.status(201).json({
      item: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const updateExpense: RequestHandler = async (req, res, next) => {
  try {
    const { id } = expenseIdParamsSchema.parse(req.params);
    const input = updateExpenseSchema.parse(req.body);
    const expense = await expenseService.update(id, input, getProfile(req));

    res.json({
      item: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense: RequestHandler = async (req, res, next) => {
  try {
    const { id } = expenseIdParamsSchema.parse(req.params);
    await expenseService.delete(id, getProfile(req));

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
