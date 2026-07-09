import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { createProduct, getProductById, listProducts, updateProduct } from "./product.controller.js";

export const productRoutes = Router();

productRoutes.use(requireAuth);

productRoutes.get("/", listProducts);
productRoutes.get("/:id", getProductById);
productRoutes.post("/", requireRole("owner"), createProduct);
productRoutes.patch("/:id", requireRole("owner"), updateProduct);
