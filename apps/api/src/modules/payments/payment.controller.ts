import type { Request, RequestHandler } from "express";
import { HttpError } from "../../lib/http-error.js";
import { paymentService } from "./payment.service.js";
import {
  listPaymentsQuerySchema,
  paymentIdParamsSchema,
  registerPaymentSchema,
} from "./payment.validations.js";

function getProfile(req: Request) {
  if (!req.auth) {
    throw new HttpError(401, "unauthorized", "Authentication required");
  }

  return req.auth.profile;
}

export const listPayments: RequestHandler = async (req, res, next) => {
  try {
    const filters = listPaymentsQuerySchema.parse(req.query);
    const payments = await paymentService.list(filters, getProfile(req));

    res.json({
      items: payments,
      next: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentById: RequestHandler = async (req, res, next) => {
  try {
    const { id } = paymentIdParamsSchema.parse(req.params);
    const payment = await paymentService.getById(id, getProfile(req));

    res.json({
      item: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const registerPayment: RequestHandler = async (req, res, next) => {
  try {
    const input = registerPaymentSchema.parse(req.body);
    const payment = await paymentService.register(input, getProfile(req));

    res.status(201).json({
      item: payment,
    });
  } catch (error) {
    next(error);
  }
};
