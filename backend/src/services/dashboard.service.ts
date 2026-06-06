import { startOfDay, isBefore } from "date-fns";
import type { BookingStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { penceToPounds } from "../utils/money.js";
import { formatNotification } from "./notification.service.js";
import { config } from "../config.js";

type BookingWithRelations = Awaited<ReturnType<typeof fetchUserBookings>>[number];

function getDisplayStatus(
  status: BookingStatus,
  appointmentDate: Date
): "upcoming" | "completed" | "cancelled" | "pending" {
  if (status === "CANCELLED") return "cancelled";
  if (status === "COMPLETED" || status === "NO_SHOW") return "completed";
  if (status === "PENDING_PAYMENT") return "pending";

  const today = startOfDay(new Date());
  if (isBefore(startOfDay(appointmentDate), today)) {
    return "completed";
  }
  return "upcoming";
}

function formatBookingCard(booking: BookingWithRelations) {
  const serviceName = booking.services.map((s) => s.service.name).join(", ");
  const displayStatus = getDisplayStatus(booking.status, booking.appointmentDate);

  return {
    id: booking.id,
    reference: booking.reference,
    serviceName,
    services: booking.services.map((s) => ({
      name: s.service.name,
      priceFormatted: penceToPounds(s.pricePence),
    })),
    addOns: booking.addOns.map((a) => ({
      name: a.service.name,
      priceFormatted: penceToPounds(a.pricePence),
    })),
    appointmentDate: booking.appointmentDate.toISOString().split("T")[0],
    appointmentTime: booking.appointmentTime,
    status: booking.status,
    displayStatus,
    depositPence: booking.depositPence,
    depositFormatted: penceToPounds(booking.depositPence),
    remainingPence: booking.remainingPence,
    remainingFormatted: penceToPounds(booking.remainingPence),
    totalPence: booking.totalPence,
    totalFormatted: penceToPounds(booking.totalPence),
    depositPaidAt: booking.depositPaidAt?.toISOString() ?? null,
    durationMin: booking.durationMin,
    createdAt: booking.createdAt.toISOString(),
  };
}

async function fetchUserBookings(userId: string) {
  return prisma.booking.findMany({
    where: { userId },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
    },
    orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
  });
}

export async function getDashboardOverview(userId: string) {
  const [user, bookings, notifications] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    fetchUserBookings(userId),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const formatted = bookings.map(formatBookingCard);
  const upcoming = formatted.filter((b) => b.displayStatus === "upcoming");
  const completed = formatted.filter((b) => b.displayStatus === "completed");

  const totalSpentPence = completed
    .filter((b) => b.depositPaidAt)
    .reduce((sum, b) => sum + b.totalPence, 0);

  const unreadCount = await prisma.notification.count({
    where: { userId, read: false },
  });

  return {
    greeting: `Welcome back, ${user.firstName}! 🌸`,
    stats: {
      upcomingAppointments: upcoming.length,
      completedBookings: completed.length,
      totalSpentPence,
      totalSpentFormatted: penceToPounds(totalSpentPence),
      yourRating: null,
      ratingNote: "Leave a review on Trustpilot after your visit",
    },
    nextAppointment: upcoming[0] ?? null,
    recentActivity: completed.slice(0, 3),
    unreadNotifications: unreadCount,
    trustpilotUrl: config.trustpilotUrl,
  };
}

export async function getMyAppointments(userId: string) {
  const bookings = await fetchUserBookings(userId);
  const formatted = bookings.map(formatBookingCard);

  return {
    upcoming: formatted.filter((b) => b.displayStatus === "upcoming"),
    past: formatted.filter((b) => b.displayStatus === "completed"),
  };
}

export async function getBookingHistory(userId: string) {
  const bookings = await fetchUserBookings(userId);

  return {
    bookings: bookings.map((b) => {
      const card = formatBookingCard(b);
      return {
        id: card.id,
        reference: card.reference,
        service: card.serviceName,
        date: card.appointmentDate,
        time: card.appointmentTime,
        totalPence: card.totalPence,
        totalFormatted: card.totalFormatted,
        status: card.status,
        displayStatus: card.displayStatus,
      };
    }),
  };
}

export async function getNotifications(userId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return {
    unreadCount,
    notifications: notifications.map(formatNotification),
  };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  return formatNotification(updated);
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return { message: "All notifications marked as read" };
}
