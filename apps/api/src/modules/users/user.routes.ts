import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { createUser, listUsers, updateUser } from "./user.controller.js";

export const userRoutes = Router();

userRoutes.use(requireAuth);

userRoutes.get("/", requireRole("owner"), listUsers);
userRoutes.post("/", requireRole("owner"), createUser);
userRoutes.patch("/:id", requireRole("owner"), updateUser);
