import type { RequestHandler } from "express";
import { userService } from "./user.service.js";
import { createUserSchema, listUsersQuerySchema, updateUserSchema, userIdParamsSchema } from "./user.validations.js";

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

export const createUser: RequestHandler = async (req, res, next) => {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await userService.create(input);

    res.status(201).json({
      item: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser: RequestHandler = async (req, res, next) => {
  try {
    const { id } = userIdParamsSchema.parse(req.params);
    const input = updateUserSchema.parse(req.body);
    const user = await userService.update(id, input);

    res.json({
      item: user,
    });
  } catch (error) {
    next(error);
  }
};
