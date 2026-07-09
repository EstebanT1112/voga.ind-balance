import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";

export const returnRoutes = Router();

returnRoutes.use(requireAuth);

returnRoutes.get("/", (_req, res) => {
  res.json({
    items: [],
    next: null,
  });
});
