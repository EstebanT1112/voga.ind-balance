import type { ErrorRequestHandler } from "express";
import { HttpError } from "../lib/http-error.js";

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    error: {
      code: "internal_error",
      message: "Unexpected server error",
    },
  });
};
