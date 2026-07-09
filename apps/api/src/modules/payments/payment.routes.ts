import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { getPaymentById, listPayments, registerPayment } from "./payment.controller.js";

export const paymentRoutes = Router();

paymentRoutes.use(requireAuth);

paymentRoutes.get("/", listPayments);
paymentRoutes.get("/:id", getPaymentById);
paymentRoutes.post("/", registerPayment);
