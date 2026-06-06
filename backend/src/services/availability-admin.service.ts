import { parseISO, startOfDay } from "date-fns";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { format } from "date-fns";

export async function getBlockedDates() {
  const dates = await prisma.blockedDate.findMany({
    orderBy: { date: "asc" },
  });

  return dates.map((d) => ({
    id: d.id,
    date: format(d.date, "yyyy-MM-dd"),
    reason: d.reason,
    createdAt: d.createdAt.toISOString(),
  }));
}

export async function blockDate(date: string, reason?: string) {
  const parsed = startOfDay(parseISO(date));

  const existing = await prisma.blockedDate.findUnique({ where: { date: parsed } });
  if (existing) {
    throw new AppError(409, "Date is already blocked", "DATE_BLOCKED");
  }

  const blocked = await prisma.blockedDate.create({
    data: { date: parsed, reason },
  });

  return {
    id: blocked.id,
    date: format(blocked.date, "yyyy-MM-dd"),
    reason: blocked.reason,
  };
}

export async function unblockDate(id: string) {
  const blocked = await prisma.blockedDate.findUnique({ where: { id } });
  if (!blocked) {
    throw new AppError(404, "Blocked date not found");
  }

  await prisma.blockedDate.delete({ where: { id } });
  return { message: "Date unblocked successfully" };
}

export async function updateBusinessHours(
  hours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[]
) {
  for (const h of hours) {
    await prisma.businessHours.upsert({
      where: { dayOfWeek: h.dayOfWeek },
      create: h,
      update: {
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      },
    });
  }

  const updated = await prisma.businessHours.findMany({
    orderBy: { dayOfWeek: "asc" },
  });

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return updated.map((h) => ({
    dayOfWeek: h.dayOfWeek,
    dayName: dayNames[h.dayOfWeek],
    openTime: h.openTime,
    closeTime: h.closeTime,
    isClosed: h.isClosed,
  }));
}

export async function markBookingCompleted(reference: string) {
  const booking = await prisma.booking.findUnique({
    where: { reference: reference.toUpperCase() },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "COMPLETED" },
  });

  return { reference: updated.reference, status: updated.status };
}
