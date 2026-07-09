import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { getReturnById, listReturns, registerReturn } from "./return.controller.js";

export const returnRoutes = Router();

returnRoutes.use(requireAuth);

returnRoutes.get("/", listReturns);
returnRoutes.get("/:id", getReturnById);
returnRoutes.post("/", registerReturn);
