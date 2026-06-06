import { parseISO, startOfDay } from "date-fns";
import type { BookingStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { penceToPounds, calculateDeposit } from "../utils/money.js";
import { generateBookingReference } from "../utils/reference.js";
import { getAvailableSlots } from "./availability.service.js";
import { getSalonSettings } from "./salon-settings.service.js";
import { createAdminNotification } from "./admin-notification.service.js";
import { format } from "date-fns";

function formatBooking(b: Awaited<ReturnType<typeof fetchBooking>>) {
  return {
    id: b.id,
    reference: b.reference,
    status: b.status,
    clientName: `${b.firstName} ${b.lastName}`,
    firstName: b.firstName,
    lastName: b.lastName,
    email: b.email,
    phone: b.phone,
    notes: b.notes,
    internalNotes: b.internalNotes,
    serviceName: b.services.map((s) => s.service.name).join(", "),
    serviceId: b.services[0]?.serviceId,
    appointmentDate: format(b.appointmentDate, "yyyy-MM-dd"),
    appointmentTime: b.appointmentTime,
    durationMin: b.durationMin,
    totalPence: b.totalPence,
    totalFormatted: penceToPounds(b.totalPence),
    depositPence: b.depositPence,
    depositFormatted: penceToPounds(b.depositPence),
    remainingFormatted: penceToPounds(b.remainingPence),
    depositPaidAt: b.depositPaidAt?.toISOString() ?? null,
    isManualBooking: b.isManualBooking,
    userId: b.userId,
    createdAt: b.createdAt.toISOString(),
  };
}

async function fetchBooking(where: { id?: string; reference?: string }) {
  const booking = await prisma.booking.findFirst({
    where: where.id ? { id: where.id } : { reference: where.reference?.toUpperCase() },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  if (!booking) throw new AppError(404, "Booking not found");
  return booking;
}

export async function getAdminBookings(filters: {
  status?: string;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters.status) where.status = filters.status as BookingStatus;
  if (filters.dateFrom || filters.dateTo) {
    where.appointmentDate = {};
    if (filters.dateFrom) (where.appointmentDate as Record<string, Date>).gte = startOfDay(parseISO(filters.dateFrom));
    if (filters.dateTo) (where.appointmentDate as Record<string, Date>).lte = startOfDay(parseISO(filters.dateTo));
  }
  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search } },
      { lastName: { contains: filters.search } },
      { email: { contains: filters.search } },
      { reference: { contains: filters.search.toUpperCase() } },
    ];
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
  });

  let filtered = bookings;
  if (filters.category) {
    filtered = bookings.filter((b) =>
      b.services.some((s) => s.service.category === filters.category)
    );
  }

  return filtered.map(formatBooking);
}

export async function getAdminBooking(reference: string) {
  const b = await fetchBooking({ reference });
  return formatBooking(b);
}

export async function updateBookingStatus(reference: string, status: BookingStatus) {
  const updated = await prisma.booking.update({
    where: { reference: reference.toUpperCase() },
    data: { status },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  return formatBooking(updated);
}

export async function updateBookingNotes(reference: string, internalNotes: string) {
  const updated = await prisma.booking.update({
    where: { reference: reference.toUpperCase() },
    data: { internalNotes },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  return formatBooking(updated);
}

export async function adminRescheduleBooking(reference: string, date: string, time: string) {
  const booking = await fetchBooking({ reference });
  const { slots } = await getAvailableSlots(date, booking.durationMin);
  if (!slots.some((s) => s.time === time)) {
    throw new AppError(409, "Slot unavailable", "SLOT_UNAVAILABLE");
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { appointmentDate: startOfDay(parseISO(date)), appointmentTime: time },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  await createAdminNotification({
    type: "BOOKING_RESCHEDULED",
    title: "Booking rescheduled",
    message: `${updated.reference} moved to ${date} at ${time}`,
    bookingId: updated.id,
    linkPath: `/admin?section=appointments&ref=${updated.reference}`,
  });

  return formatBooking(updated);
}

export async function createManualBooking(input: {
  serviceId: string;
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes?: string;
  internalNotes?: string;
  depositPaid: boolean;
  userId?: string;
}) {
  const settings = await getSalonSettings();
  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, isActive: true, isAddOn: false },
  });
  if (!service) throw new AppError(404, "Service not found");

  const { slots } = await getAvailableSlots(input.date, service.durationMin);
  if (!slots.some((s) => s.time === input.time)) {
    throw new AppError(409, "Slot unavailable", "SLOT_UNAVAILABLE");
  }

  const depositPence = calculateDeposit(service.pricePence, settings.depositPercentage);
  const remainingPence = service.pricePence - depositPence;

  let reference = generateBookingReference();
  while (await prisma.booking.findUnique({ where: { reference } })) {
    reference = generateBookingReference();
  }

  const booking = await prisma.booking.create({
    data: {
      reference,
      status: input.depositPaid ? "CONFIRMED" : "PENDING_PAYMENT",
      userId: input.userId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      notes: input.notes,
      internalNotes: input.internalNotes,
      isManualBooking: true,
      appointmentDate: startOfDay(parseISO(input.date)),
      appointmentTime: input.time,
      durationMin: service.durationMin,
      totalPence: service.pricePence,
      depositPence,
      remainingPence,
      depositPaidAt: input.depositPaid ? new Date() : null,
      policyAccepted: true,
      services: { create: { serviceId: service.id, pricePence: service.pricePence } },
    },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  await createAdminNotification({
    type: "NEW_BOOKING",
    title: "Manual booking created",
    message: `${booking.reference} — ${service.name} for ${input.firstName} ${input.lastName}`,
    bookingId: booking.id,
    linkPath: `/admin?section=appointments&ref=${booking.reference}`,
  });

  return formatBooking(booking);
}
