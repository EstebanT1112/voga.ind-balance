import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";

export const paymentRoutes = Router();

paymentRoutes.use(requireAuth);

paymentRoutes.get("/", (_req, res) => {
  res.json({
    items: [],
    next: null,
  });
});
