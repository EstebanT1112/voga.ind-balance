import type { Request, RequestHandler } from "express";
import { HttpError } from "../../lib/http-error.js";
import { saleService } from "./sale.service.js";
import { createSaleSchema, listSalesQuerySchema, saleIdParamsSchema, sellerDashboardQuerySchema } from "./sale.validations.js";

function getProfile(req: Request) {
  if (!req.auth) {
    throw new HttpError(401, "unauthorized", "Authentication required");
  }

  return req.auth.profile;
}

export const listSales: RequestHandler = async (req, res, next) => {
  try {
    const filters = listSalesQuerySchema.parse(req.query);
    const sales = await saleService.list(filters, getProfile(req));

    res.json({
      items: sales,
      next: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getSellerDashboard: RequestHandler = async (req, res, next) => {
  try {
    const filters = sellerDashboardQuerySchema.parse(req.query);
    const dashboard = await saleService.getSellerDashboard(filters, getProfile(req));

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
};

export const getSaleById: RequestHandler = async (req, res, next) => {
  try {
    const { id } = saleIdParamsSchema.parse(req.params);
    const sale = await saleService.getById(id, getProfile(req));

    res.json({
      item: sale,
    });
  } catch (error) {
    next(error);
  }
};

export const createSale: RequestHandler = async (req, res, next) => {
  try {
    const input = createSaleSchema.parse(req.body);
    const sale = await saleService.create(input, getProfile(req));

    res.status(201).json({
      item: sale,
    });
  } catch (error) {
    next(error);
  }
};
