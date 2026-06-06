import { Router } from "express";
import { asyncHandler } from "../lib/errors.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.middleware.js";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from "../validators/auth.validator.js";
import {
  registerUser,
  loginUser,
  getUserById,
  updateUserProfile,
} from "../services/auth.service.js";
import {
  requestPasswordReset,
  resetPassword,
} from "../services/password-reset.service.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/password-reset.validator.js";

const router = Router();

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await registerUser(input);
    res.status(201).json(result);
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await loginUser(email, password);
    res.json(result);
  })
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await requestPasswordReset(email);
    res.json(result);
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(token, password);
    res.json(result);
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await getUserById(req.user!.userId);
    res.json({ user });
  })
);

router.patch(
  "/profile",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const input = updateProfileSchema.parse(req.body);
    const result = await updateUserProfile(req.user!.userId, {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      newPassword: input.newPassword || undefined,
    });
    res.json(result);
  })
);

export default router;
