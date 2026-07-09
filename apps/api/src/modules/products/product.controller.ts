import type { Request, RequestHandler } from "express";
import { HttpError } from "../../lib/http-error.js";
import { productService } from "./product.service.js";
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamsSchema,
  updateProductSchema,
} from "./product.validations.js";

function getProfile(req: Request) {
  if (!req.auth) {
    throw new HttpError(401, "unauthorized", "Authentication required");
  }

  return req.auth.profile;
}

export const listProducts: RequestHandler = async (req, res, next) => {
  try {
    const filters = listProductsQuerySchema.parse(req.query);
    const products = await productService.list(filters, getProfile(req));

    res.json({
      items: products,
      next: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById: RequestHandler = async (req, res, next) => {
  try {
    const { id } = productIdParamsSchema.parse(req.params);
    const product = await productService.getById(id, getProfile(req));

    res.json({
      item: product,
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct: RequestHandler = async (req, res, next) => {
  try {
    const input = createProductSchema.parse(req.body);
    const product = await productService.create(input, getProfile(req));

    res.status(201).json({
      item: product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct: RequestHandler = async (req, res, next) => {
  try {
    const { id } = productIdParamsSchema.parse(req.params);
    const input = updateProductSchema.parse(req.body);
    const product = await productService.update(id, input, getProfile(req));

    res.json({
      item: product,
    });
  } catch (error) {
    next(error);
  }
};
