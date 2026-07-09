import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { expenseRoutes } from "./modules/expenses/expense.routes.js";
import { paymentRoutes } from "./modules/payments/payment.routes.js";
import { productRoutes } from "./modules/products/product.routes.js";
import { reportRoutes } from "./modules/reports/report.routes.js";
import { returnRoutes } from "./modules/returns/return.routes.js";
import { saleRoutes } from "./modules/sales/sale.routes.js";
import { userRoutes } from "./modules/users/user.routes.js";

export const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
    credentials: env.CORS_ORIGIN !== "*",
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "voga.ind balance api",
  });
});

app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/sales", saleRoutes);
app.use("/payments", paymentRoutes);
app.use("/returns", returnRoutes);
app.use("/expenses", expenseRoutes);
app.use("/reports", reportRoutes);
app.use("/users", userRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
