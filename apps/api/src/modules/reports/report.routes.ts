import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";

export const reportRoutes = Router();

reportRoutes.use(requireAuth);
reportRoutes.use(requireRole("owner"));

reportRoutes.get("/", (_req, res) => {
  res.json({
    topCategories: [],
    topSizes: [],
    collectedProfit: 0,
  });
});
