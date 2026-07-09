import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { listUsers } from "./user.controller.js";

export const userRoutes = Router();

userRoutes.use(requireAuth);

userRoutes.get("/", requireRole("owner"), listUsers);
