import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { getSalonSettings, updateSalonSettings } from "./salon-settings.service.js";
import { getTemplatesForAdmin } from "./email-templates.service.js";
import { EMAIL_PLACEHOLDER_HINT } from "./email-template-defaults.js";

const SALT_ROUNDS = 12;

export async function getAdminSettings(adminId: string) {
  const [admin, salon] = await Promise.all([
    prisma.admin.findUnique({ where: { id: adminId } }),
    getSalonSettings(),
  ]);

  if (!admin) throw new AppError(404, "Admin not found");

  return {
    profile: { id: admin.id, name: admin.name, email: admin.email },
    business: {
      businessName: salon.businessName,
      contactEmail: salon.contactEmail,
      trustpilotUrl: salon.trustpilotUrl,
      instagramUrl: salon.instagramUrl,
      tiktokUrl: salon.tiktokUrl,
      facebookUrl: salon.facebookUrl,
      logoUrl: salon.logoUrl,
    },
    booking: {
      depositPercentage: salon.depositPercentage,
      cancellationHours: salon.cancellationHours,
      bufferMinutes: salon.bufferMinutes,
      leadTimeHours: salon.leadTimeHours,
    },
    email: {
      emailBookingConfirm: salon.emailBookingConfirm,
      emailReminder: salon.emailReminder,
      emailReviewRequest: salon.emailReviewRequest,
      emailCancellation: salon.emailCancellation,
    },
    templates: getTemplatesForAdmin(salon),
    placeholderHint: EMAIL_PLACEHOLDER_HINT,
  };
}

export async function updateEmailTemplates(data: {
  bookingConfirm?: { subject?: string; body?: string };
  reminder?: { subject?: string; body?: string };
  review?: { subject?: string; body?: string };
  cancellation?: { subject?: string; body?: string };
}) {
  const patch: Parameters<typeof updateSalonSettings>[0] = {};
  if (data.bookingConfirm?.subject !== undefined) patch.templateBookingConfirmSubject = data.bookingConfirm.subject;
  if (data.bookingConfirm?.body !== undefined) patch.templateBookingConfirmBody = data.bookingConfirm.body;
  if (data.reminder?.subject !== undefined) patch.templateReminderSubject = data.reminder.subject;
  if (data.reminder?.body !== undefined) patch.templateReminderBody = data.reminder.body;
  if (data.review?.subject !== undefined) patch.templateReviewSubject = data.review.subject;
  if (data.review?.body !== undefined) patch.templateReviewBody = data.review.body;
  if (data.cancellation?.subject !== undefined) patch.templateCancellationSubject = data.cancellation.subject;
  if (data.cancellation?.body !== undefined) patch.templateCancellationBody = data.cancellation.body;
  const updated = await updateSalonSettings(patch);
  return { templates: getTemplatesForAdmin(updated) };
}

export async function uploadLogo(filename: string) {
  const logoUrl = `/uploads/logos/${filename}`;
  const updated = await updateSalonSettings({ logoUrl });
  return { logoUrl: updated.logoUrl };
}

export async function updateAdminProfile(
  adminId: string,
  data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }
) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError(404, "Admin not found");

  const update: { name?: string; email?: string; passwordHash?: string } = {};
  if (data.name) update.name = data.name;
  if (data.email) update.email = data.email.toLowerCase();

  if (data.newPassword) {
    if (!data.currentPassword) throw new AppError(400, "Current password required");
    const valid = await bcrypt.compare(data.currentPassword, admin.passwordHash);
    if (!valid) throw new AppError(401, "Current password is incorrect");
    update.passwordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
  }

  const updated = await prisma.admin.update({ where: { id: adminId }, data: update });
  return { id: updated.id, name: updated.name, email: updated.email };
}

export async function updateBusinessSettings(data: Parameters<typeof updateSalonSettings>[0]) {
  const updated = await updateSalonSettings(data);
  return updated;
}
