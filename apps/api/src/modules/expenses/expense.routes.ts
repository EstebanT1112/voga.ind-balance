import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import {
  createExpense,
  deleteExpense,
  getExpenseById,
  listExpenses,
  updateExpense,
} from "./expense.controller.js";

export const expenseRoutes = Router();

expenseRoutes.use(requireAuth);
expenseRoutes.use(requireRole("owner"));

expenseRoutes.get("/", listExpenses);
expenseRoutes.get("/:id", getExpenseById);
expenseRoutes.post("/", createExpense);
expenseRoutes.patch("/:id", updateExpense);
expenseRoutes.delete("/:id", deleteExpense);
