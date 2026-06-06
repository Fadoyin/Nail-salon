import type { AdminNotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

interface CreateAdminNotificationInput {
  type: AdminNotificationType;
  title: string;
  message: string;
  bookingId?: string;
  userId?: string;
  linkPath?: string;
}

export async function createAdminNotification(input: CreateAdminNotificationInput) {
  return prisma.adminNotification.create({ data: input });
}

export async function getAdminNotifications() {
  const [notifications, unreadCount] = await Promise.all([
    prisma.adminNotification.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.adminNotification.count({ where: { read: false } }),
  ]);
  return { notifications, unreadCount };
}

export async function markAdminNotificationRead(id: string) {
  return prisma.adminNotification.update({ where: { id }, data: { read: true } });
}

export async function markAllAdminNotificationsRead() {
  await prisma.adminNotification.updateMany({ where: { read: false }, data: { read: true } });
  return { message: "All notifications marked as read" };
}
