import type { Request, RequestHandler } from "express";
import { HttpError } from "../../lib/http-error.js";
import { returnService } from "./return.service.js";
import { listReturnsQuerySchema, registerReturnSchema, returnIdParamsSchema } from "./return.validations.js";

function getProfile(req: Request) {
  if (!req.auth) {
    throw new HttpError(401, "unauthorized", "Authentication required");
  }

  return req.auth.profile;
}

export const listReturns: RequestHandler = async (req, res, next) => {
  try {
    const filters = listReturnsQuerySchema.parse(req.query);
    const returns = await returnService.list(filters, getProfile(req));

    res.json({
      items: returns,
      next: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getReturnById: RequestHandler = async (req, res, next) => {
  try {
    const { id } = returnIdParamsSchema.parse(req.params);
    const returnRow = await returnService.getById(id, getProfile(req));

    res.json({
      item: returnRow,
    });
  } catch (error) {
    next(error);
  }
};

export const registerReturn: RequestHandler = async (req, res, next) => {
  try {
    const input = registerReturnSchema.parse(req.body);
    const returnRow = await returnService.register(input, getProfile(req));

    res.status(201).json({
      item: returnRow,
    });
  } catch (error) {
    next(error);
  }
};
