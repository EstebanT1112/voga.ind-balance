import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";

export const saleRoutes = Router();

saleRoutes.use(requireAuth);

saleRoutes.get("/", (_req, res) => {
  res.json({
    items: [],
    next: null,
  });
});
