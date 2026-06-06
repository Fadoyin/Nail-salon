import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { penceToPounds } from "../utils/money.js";
import { format } from "date-fns";

export async function getAdminClients(search?: string, sortBy?: string) {
  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : undefined,
    include: {
      bookings: {
        where: { status: { not: "CANCELLED" } },
        select: { totalPence: true, depositPaidAt: true, appointmentDate: true },
      },
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const clients = users.map((u) => {
    const totalSpent = u.bookings.reduce((sum, b) => sum + (b.depositPaidAt ? b.totalPence : 0), 0);
    const lastVisit = u.bookings.length
      ? u.bookings.sort((a, b) => b.appointmentDate.getTime() - a.appointmentDate.getTime())[0].appointmentDate
      : null;

    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName} ${u.lastName}`,
      email: u.email,
      phone: u.phone,
      initials: `${u.firstName[0]}${u.lastName[0]}`.toUpperCase(),
      createdAt: u.createdAt.toISOString(),
      bookingCount: u._count.bookings,
      totalSpentPence: totalSpent,
      totalSpentFormatted: penceToPounds(totalSpent),
      lastVisit: lastVisit ? format(lastVisit, "yyyy-MM-dd") : null,
      internalNotes: u.internalNotes,
    };
  });

  if (sortBy === "spent") clients.sort((a, b) => b.totalSpentPence - a.totalSpentPence);
  if (sortBy === "bookings") clients.sort((a, b) => b.bookingCount - a.bookingCount);
  if (sortBy === "recent") clients.sort((a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""));

  return clients;
}

export async function getAdminClient(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      bookings: {
        include: { services: { include: { service: true } } },
        orderBy: { appointmentDate: "desc" },
      },
    },
  });

  if (!user) throw new AppError(404, "Client not found");

  const totalSpent = user.bookings
    .filter((b) => b.depositPaidAt && b.status !== "CANCELLED")
    .reduce((sum, b) => sum + b.totalPence, 0);

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
    internalNotes: user.internalNotes,
    totalSpentFormatted: penceToPounds(totalSpent),
    bookingCount: user.bookings.length,
    bookings: user.bookings.map((b) => ({
      reference: b.reference,
      service: b.services.map((s) => s.service.name).join(", "),
      date: format(b.appointmentDate, "yyyy-MM-dd"),
      time: b.appointmentTime,
      totalFormatted: penceToPounds(b.totalPence),
      status: b.status,
    })),
  };
}

export async function updateClientNotes(id: string, internalNotes: string) {
  const user = await prisma.user.update({
    where: { id },
    data: { internalNotes },
  });
  return { id: user.id, internalNotes: user.internalNotes };
}
