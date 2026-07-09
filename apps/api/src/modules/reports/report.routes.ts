import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { getReportSummary } from "./report.controller.js";

export const reportRoutes = Router();

reportRoutes.use(requireAuth);
reportRoutes.use(requireRole("owner"));

reportRoutes.get("/", getReportSummary);
