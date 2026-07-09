import type { RequestHandler } from "express";

export const getMe: RequestHandler = (req, res) => {
  const auth = req.auth;

  if (!auth) {
    res.status(401).json({
      error: {
        code: "unauthorized",
        message: "Authentication required",
      },
    });
    return;
  }

  res.json({
    user: {
      id: auth.user.id,
      email: auth.user.email ?? null,
    },
    profile: auth.profile,
  });
};
