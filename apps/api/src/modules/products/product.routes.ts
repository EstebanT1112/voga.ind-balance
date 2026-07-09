import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";

export const productRoutes = Router();

productRoutes.use(requireAuth);

productRoutes.get("/", (_req, res) => {
  res.json({
    items: [],
    next: null,
  });
});
