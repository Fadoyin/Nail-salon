import type { NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  bookingId?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({ data: input });
}

export async function createWelcomeNotification(userId: string, firstName: string) {
  return createNotification({
    userId,
    type: "WELCOME",
    title: "Welcome to Dollhouse Lounge 🌸",
    message: `Hi ${firstName}! Your account is ready. Book your first appointment and treat yourself to something beautiful.`,
  });
}

export async function createDepositConfirmedNotification(
  userId: string,
  bookingId: string,
  reference: string,
  depositFormatted: string
) {
  return createNotification({
    userId,
    type: "DEPOSIT_CONFIRMED",
    title: "Deposit confirmed 💳",
    message: `Your ${depositFormatted} deposit for booking ${reference} has been received. Your appointment is confirmed!`,
    bookingId,
  });
}

export async function createReviewRequestNotification(
  userId: string,
  bookingId: string
) {
  return createNotification({
    userId,
    type: "REVIEW_REQUEST",
    title: "How was your visit? ⭐",
    message: "We'd love to hear about your experience! Leave us a review on Trustpilot.",
    bookingId,
  });
}

export async function createBookingCancelledNotification(
  userId: string,
  bookingId: string,
  reference: string
) {
  return createNotification({
    userId,
    type: "BOOKING_CANCELLED",
    title: "Appointment cancelled",
    message: `Your booking ${reference} has been cancelled.`,
    bookingId,
  });
}

export async function createBookingRescheduledNotification(
  userId: string,
  bookingId: string,
  reference: string,
  newDate: string,
  newTime: string
) {
  return createNotification({
    userId,
    type: "BOOKING_RESCHEDULED",
    title: "Appointment rescheduled 📅",
    message: `Your booking ${reference} has been moved to ${newDate} at ${newTime}.`,
    bookingId,
  });
}

export function formatNotification(notification: {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  bookingId: string | null;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    bookingId: notification.bookingId,
    createdAt: notification.createdAt.toISOString(),
    timestamp: notification.createdAt.toISOString(),
  };
}
