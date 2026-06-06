import crypto from "crypto";
import bcrypt from "bcryptjs";
import { addHours } from "date-fns";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { AppError } from "../lib/errors.js";
import { sendPasswordResetEmail } from "./email.service.js";

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY_HOURS = 1;

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Always return success to prevent email enumeration
  const genericMessage =
    "If an account exists with that email, we've sent password reset instructions.";

  if (!user) {
    return { message: genericMessage, devResetUrl: null };
  }

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = addHours(new Date(), TOKEN_EXPIRY_HOURS);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, user.firstName, resetUrl);

  return {
    message: genericMessage,
    devResetUrl: config.nodeEnv === "development" ? resetUrl : null,
  };
}

export async function resetPassword(token: string, newPassword: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new AppError(400, "Invalid or expired reset link", "INVALID_TOKEN");
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { message: "Password updated successfully. You can now log in." };
}
