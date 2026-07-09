import type { RequestHandler } from "express";
import { userService } from "./user.service.js";
import { listUsersQuerySchema } from "./user.validations.js";

export const listUsers: RequestHandler = async (req, res, next) => {
  try {
    const filters = listUsersQuerySchema.parse(req.query);
    const users = await userService.list(filters);

    res.json({
      items: users,
      next: null,
    });
  } catch (error) {
    next(error);
  }
};
