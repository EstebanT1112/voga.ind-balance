import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { createSale, getSaleById, listSales } from "./sale.controller.js";

export const saleRoutes = Router();

saleRoutes.use(requireAuth);

saleRoutes.get("/", listSales);
saleRoutes.get("/:id", getSaleById);
saleRoutes.post("/", createSale);
