import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";

export const expenseRoutes = Router();

expenseRoutes.use(requireAuth);
expenseRoutes.use(requireRole("owner"));

expenseRoutes.get("/", (_req, res) => {
  res.json({
    items: [],
    next: null,
  });
});
