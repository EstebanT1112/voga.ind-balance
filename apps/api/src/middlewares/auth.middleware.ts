import type { RequestHandler } from "express";
import { HttpError } from "../lib/http-error.js";
import { supabaseAuth } from "../lib/supabase.js";
import { usersRepository } from "../modules/users/user.repository.js";
import type { ApiRole } from "../modules/users/user.types.js";

function getBearerToken(authorization: string | undefined): string {
  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError(401, "unauthorized", "Missing bearer token");
  }

  return authorization.slice("Bearer ".length).trim();
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = getBearerToken(req.header("authorization"));
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data.user) {
      throw new HttpError(401, "unauthorized", "Invalid or expired token");
    }

    const profile = await usersRepository.findProfileById(data.user.id);

    if (!profile) {
      throw new HttpError(403, "forbidden", "User profile is not configured");
    }

    if (!profile.active) {
      throw new HttpError(403, "forbidden", "User is inactive");
    }

    req.auth = {
      token,
      user: data.user,
      profile,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(...roles: ApiRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new HttpError(401, "unauthorized", "Authentication required"));
      return;
    }

    if (!roles.includes(req.auth.profile.role)) {
      next(new HttpError(403, "forbidden", "Insufficient permissions"));
      return;
    }

    next();
  };
}
