import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";

export async function getSalonSettings() {
  let settings = await prisma.salonSettings.findUnique({ where: { id: "default" } });

  if (!settings) {
    settings = await prisma.salonSettings.create({
      data: {
        id: "default",
        trustpilotUrl: config.trustpilotUrl,
        depositPercentage: config.depositPercentage,
        cancellationHours: config.cancellationHours,
      },
    });
  }

  return settings;
}

export async function updateSalonSettings(data: Partial<{
  businessName: string;
  contactEmail: string;
  depositPercentage: number;
  cancellationHours: number;
  bufferMinutes: number;
  leadTimeHours: number;
  trustpilotUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  logoUrl: string | null;
  emailBookingConfirm: boolean;
  emailReminder: boolean;
  emailReviewRequest: boolean;
  emailCancellation: boolean;
  templateBookingConfirmSubject: string | null;
  templateBookingConfirmBody: string | null;
  templateReminderSubject: string | null;
  templateReminderBody: string | null;
  templateReviewSubject: string | null;
  templateReviewBody: string | null;
  templateCancellationSubject: string | null;
  templateCancellationBody: string | null;
}>) {
  await getSalonSettings();
  return prisma.salonSettings.update({
    where: { id: "default" },
    data,
  });
}
