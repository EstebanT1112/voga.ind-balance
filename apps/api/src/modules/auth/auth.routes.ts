import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { getMe } from "./auth.controller.js";

export const authRoutes = Router();

authRoutes.get("/me", requireAuth, getMe);
