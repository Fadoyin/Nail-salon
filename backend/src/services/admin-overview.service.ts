import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
import { prisma } from "../lib/prisma.js";
import { penceToPounds } from "../utils/money.js";

const activeStatuses = ["CONFIRMED", "COMPLETED", "PENDING_PAYMENT"] as const;

function revenueWhere(dateFrom: Date, dateTo: Date) {
  return {
    depositPaidAt: { gte: dateFrom, lte: dateTo },
    status: { not: "CANCELLED" as const },
  };
}

export async function getAdminOverview() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    bookingsToday,
    bookingsWeek,
    bookingsMonth,
    revenueToday,
    revenueWeek,
    revenueMonth,
    newClientsWeek,
    cancellationsMonth,
    todaySchedule,
    pendingBookings,
  ] = await Promise.all([
    prisma.booking.count({
      where: { appointmentDate: { gte: todayStart, lte: todayEnd }, status: { in: [...activeStatuses] } },
    }),
    prisma.booking.count({
      where: { appointmentDate: { gte: weekStart, lte: weekEnd }, status: { in: [...activeStatuses] } },
    }),
    prisma.booking.count({
      where: { appointmentDate: { gte: monthStart, lte: monthEnd }, status: { in: [...activeStatuses] } },
    }),
    prisma.booking.aggregate({ where: revenueWhere(todayStart, todayEnd), _sum: { depositPence: true } }),
    prisma.booking.aggregate({ where: revenueWhere(weekStart, weekEnd), _sum: { depositPence: true } }),
    prisma.booking.aggregate({ where: revenueWhere(monthStart, monthEnd), _sum: { depositPence: true } }),
    prisma.user.count({ where: { createdAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.booking.count({
      where: { status: "CANCELLED", cancelledAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.booking.findMany({
      where: { appointmentDate: { gte: todayStart, lte: todayEnd }, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } },
      include: { services: { include: { service: true } } },
      orderBy: { appointmentTime: "asc" },
    }),
    prisma.booking.count({ where: { status: "PENDING_PAYMENT" } }),
  ]);

  return {
    stats: {
      bookingsToday,
      bookingsWeek,
      bookingsMonth,
      revenueTodayPence: revenueToday._sum.depositPence ?? 0,
      revenueTodayFormatted: penceToPounds(revenueToday._sum.depositPence ?? 0),
      revenueWeekPence: revenueWeek._sum.depositPence ?? 0,
      revenueWeekFormatted: penceToPounds(revenueWeek._sum.depositPence ?? 0),
      revenueMonthPence: revenueMonth._sum.depositPence ?? 0,
      revenueMonthFormatted: penceToPounds(revenueMonth._sum.depositPence ?? 0),
      newClientsWeek,
      cancellationsMonth,
      pendingBookings,
    },
    todaySchedule: todaySchedule.map((b) => ({
      reference: b.reference,
      clientName: `${b.firstName} ${b.lastName}`,
      service: b.services.map((s) => s.service.name).join(", "),
      time: b.appointmentTime,
      depositFormatted: penceToPounds(b.depositPence),
      depositPaid: Boolean(b.depositPaidAt),
      status: b.status,
    })),
  };
}
