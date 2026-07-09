import type { Request, RequestHandler } from "express";
import { HttpError } from "../../lib/http-error.js";
import { reportService } from "./report.service.js";
import { reportQuerySchema } from "./report.validations.js";

function getProfile(req: Request) {
  if (!req.auth) {
    throw new HttpError(401, "unauthorized", "Authentication required");
  }

  return req.auth.profile;
}

export const getReportSummary: RequestHandler = async (req, res, next) => {
  try {
    const filters = reportQuerySchema.parse(req.query);
    const report = await reportService.getSummary(filters, getProfile(req));

    res.json(report);
  } catch (error) {
    next(error);
  }
};
