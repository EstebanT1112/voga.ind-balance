import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { createSale, getSaleById, getSellerDashboard, listSales } from "./sale.controller.js";

export const saleRoutes = Router();

saleRoutes.use(requireAuth);

saleRoutes.get("/dashboard", requireRole("seller"), getSellerDashboard);
saleRoutes.get("/", listSales);
saleRoutes.get("/:id", getSaleById);
saleRoutes.post("/", createSale);
