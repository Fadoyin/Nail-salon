import { parseISO, startOfDay, differenceInHours } from "date-fns";
import { prisma } from "../lib/prisma.js";
import { getStripe } from "../lib/stripe.js";
import { config, CANCELLATION_POLICY } from "../config.js";
import { AppError } from "../lib/errors.js";
import { calculateDeposit, penceToPounds } from "../utils/money.js";
import { generateBookingReference } from "../utils/reference.js";
import { getAvailableSlots } from "./availability.service.js";
import { sendBookingConfirmation, sendCancellationEmail } from "./email.service.js";
import {
  createDepositConfirmedNotification,
  createBookingCancelledNotification,
  createBookingRescheduledNotification,
} from "./notification.service.js";
import { createAdminNotification } from "./admin-notification.service.js";

interface CreateBookingInput {
  serviceId: string;
  addOnIds?: string[];
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes?: string;
  policyAccepted: boolean;
  userId?: string;
}

export async function createBooking(input: CreateBookingInput) {
  if (!input.policyAccepted) {
    throw new AppError(400, "You must accept the cancellation policy to book", "POLICY_NOT_ACCEPTED");
  }

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, isActive: true, isAddOn: false },
  });

  if (!service) {
    throw new AppError(404, "Service not found");
  }

  const addOns = input.addOnIds?.length
    ? await prisma.service.findMany({
        where: { id: { in: input.addOnIds }, isActive: true, isAddOn: true },
      })
    : [];

  if (input.addOnIds?.length && addOns.length !== input.addOnIds.length) {
    throw new AppError(400, "One or more add-ons are invalid");
  }

  const totalDuration = service.durationMin + addOns.reduce((sum, a) => sum + a.durationMin, 0);
  const { slots } = await getAvailableSlots(input.date, totalDuration);
  const slotAvailable = slots.some((s) => s.time === input.time);

  if (!slotAvailable) {
    throw new AppError(409, "Selected time slot is no longer available", "SLOT_UNAVAILABLE");
  }

  const addOnTotal = addOns.reduce((sum, a) => sum + a.pricePence, 0);
  const totalPence = service.pricePence + addOnTotal;
  const depositPence = calculateDeposit(totalPence, config.depositPercentage);
  const remainingPence = totalPence - depositPence;

  let reference = generateBookingReference();
  let exists = await prisma.booking.findUnique({ where: { reference } });
  while (exists) {
    reference = generateBookingReference();
    exists = await prisma.booking.findUnique({ where: { reference } });
  }

  const booking = await prisma.booking.create({
    data: {
      reference,
      userId: input.userId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      notes: input.notes,
      appointmentDate: startOfDay(parseISO(input.date)),
      appointmentTime: input.time,
      durationMin: totalDuration,
      totalPence,
      depositPence,
      remainingPence,
      policyAccepted: true,
      services: {
        create: { serviceId: service.id, pricePence: service.pricePence },
      },
      addOns: {
        create: addOns.map((a) => ({ serviceId: a.id, pricePence: a.pricePence })),
      },
    },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
    },
  });

  let clientSecret: string | null = null;

  if (config.isStripeConfigured()) {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: depositPence,
      currency: "gbp",
      metadata: {
        bookingId: booking.id,
        bookingReference: booking.reference,
      },
      automatic_payment_methods: { enabled: true },
      receipt_email: booking.email,
      description: `Dollhouse Lounge deposit — ${booking.reference}`,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    clientSecret = paymentIntent.client_secret;
  }

  await createAdminNotification({
    type: "NEW_BOOKING",
    title: "New booking received",
    message: `${reference} — ${service.name} on ${input.date} at ${input.time}`,
    bookingId: booking.id,
    linkPath: `/admin?section=appointments&ref=${reference}`,
  });

  return {
    booking: formatBookingResponse(booking),
    payment: {
      clientSecret,
      depositPence,
      depositFormatted: penceToPounds(depositPence),
      totalPence,
      totalFormatted: penceToPounds(totalPence),
      remainingPence,
      remainingFormatted: penceToPounds(remainingPence),
    },
    cancellationPolicy: CANCELLATION_POLICY,
  };
}

export async function confirmBookingPayment(paymentIntentId: string) {
  const booking = await prisma.booking.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
    },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found for this payment");
  }

  if (booking.status === "CONFIRMED") {
    return { booking: formatBookingResponse(booking), alreadyConfirmed: true };
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "CONFIRMED",
      depositPaidAt: new Date(),
    },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
    },
  });

  if (!updated.confirmationEmailSent) {
    const sent = await sendBookingConfirmation(updated);
    if (sent) {
      await prisma.booking.update({
        where: { id: updated.id },
        data: { confirmationEmailSent: true },
      });
    }
  }

  if (updated.userId) {
    await createDepositConfirmedNotification(
      updated.userId,
      updated.id,
      updated.reference,
      penceToPounds(updated.depositPence)
    );
  }

  await createAdminNotification({
    type: "DEPOSIT_CONFIRMED",
    title: "Deposit confirmed",
    message: `${penceToPounds(updated.depositPence)} received for ${updated.reference}`,
    bookingId: updated.id,
    linkPath: `/admin?section=payments`,
  });

  return { booking: formatBookingResponse(updated), alreadyConfirmed: false };
}

export async function getBookingByReference(reference: string) {
  const booking = await prisma.booking.findUnique({
    where: { reference: reference.toUpperCase() },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
    },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  return formatBookingResponse(booking);
}

function getHoursUntilAppointment(appointmentDate: Date, appointmentTime: string): number {
  const appointmentDateTime = parseISO(
    `${appointmentDate.toISOString().split("T")[0]}T${appointmentTime}:00`
  );
  return differenceInHours(appointmentDateTime, new Date());
}

export async function cancelBooking(
  reference: string,
  reason?: string,
  userId?: string
) {
  const booking = await prisma.booking.findUnique({
    where: { reference: reference.toUpperCase() },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  if (userId && booking.userId !== userId) {
    throw new AppError(403, "You do not have permission to cancel this booking", "FORBIDDEN");
  }

  if (booking.status === "CANCELLED") {
    throw new AppError(400, "Booking is already cancelled");
  }

  if (booking.status !== "CONFIRMED") {
    throw new AppError(400, "Only confirmed bookings can be cancelled");
  }

  const hoursUntil = getHoursUntilAppointment(booking.appointmentDate, booking.appointmentTime);
  const eligibleForRefund = hoursUntil >= config.cancellationHours;

  let refundPence = 0;

  if (eligibleForRefund && booking.stripePaymentIntentId && config.isStripeConfigured()) {
    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
      amount: booking.depositPence,
    });
    refundPence = booking.depositPence;
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason,
      refundPence,
    },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
    },
  });

  if (updated.userId) {
    await createBookingCancelledNotification(
      updated.userId,
      updated.id,
      updated.reference
    );
  }

  await createAdminNotification({
    type: eligibleForRefund ? "BOOKING_CANCELLED" : "LATE_CANCELLATION",
    title: eligibleForRefund ? "Booking cancelled" : "Late cancellation (no refund)",
    message: `${updated.reference} cancelled by client`,
    bookingId: updated.id,
    linkPath: `/admin?section=appointments&ref=${updated.reference}`,
  });

  await sendCancellationEmail(updated);

  return {
    booking: formatBookingResponse(updated),
    refund: {
      eligible: eligibleForRefund,
      amountPence: refundPence,
      amountFormatted: penceToPounds(refundPence),
      hoursUntil,
      message: eligibleForRefund
        ? "Your deposit has been refunded."
        : `Cancellation within ${config.cancellationHours} hours — deposit is non-refundable per our policy.`,
    },
  };
}

export async function rescheduleBooking(
  reference: string,
  date: string,
  time: string,
  userId?: string
) {
  const booking = await prisma.booking.findUnique({
    where: { reference: reference.toUpperCase() },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
    },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  if (userId && booking.userId !== userId) {
    throw new AppError(403, "You do not have permission to reschedule this booking", "FORBIDDEN");
  }

  if (booking.status !== "CONFIRMED") {
    throw new AppError(400, "Only confirmed bookings can be rescheduled");
  }

  const hoursUntil = getHoursUntilAppointment(booking.appointmentDate, booking.appointmentTime);
  if (hoursUntil < config.cancellationHours) {
    throw new AppError(
      400,
      `Rescheduling is only available more than ${config.cancellationHours} hours before your appointment`,
      "POLICY_WINDOW"
    );
  }

  const { slots } = await getAvailableSlots(date, booking.durationMin);
  const slotAvailable = slots.some((s) => s.time === time);
  if (!slotAvailable) {
    throw new AppError(409, "Selected time slot is no longer available", "SLOT_UNAVAILABLE");
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      appointmentDate: startOfDay(parseISO(date)),
      appointmentTime: time,
    },
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
    },
  });

  if (updated.userId) {
    await createBookingRescheduledNotification(
      updated.userId,
      updated.id,
      updated.reference,
      date,
      time
    );
  }

  return {
    booking: formatBookingResponse(updated),
    message: "Appointment rescheduled successfully",
  };
}

export function getBookingPolicyStatus(appointmentDate: Date, appointmentTime: string) {
  const hoursUntil = getHoursUntilAppointment(appointmentDate, appointmentTime);
  return {
    hoursUntil,
    canCancel: hoursUntil > 0,
    canReschedule: hoursUntil >= config.cancellationHours,
    refundEligible: hoursUntil >= config.cancellationHours,
    cancellationHours: config.cancellationHours,
  };
}

type BookingWithDetails = {
  id: string;
  reference: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string | null;
  appointmentDate: Date;
  appointmentTime: string;
  durationMin: number;
  totalPence: number;
  depositPence: number;
  remainingPence: number;
  depositPaidAt: Date | null;
  createdAt: Date;
  services: { service: { name: string; category: string }; pricePence: number }[];
  addOns: { service: { name: string }; pricePence: number }[];
};

function formatBookingResponse(booking: BookingWithDetails) {
  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    firstName: booking.firstName,
    lastName: booking.lastName,
    email: booking.email,
    phone: booking.phone,
    notes: booking.notes,
    appointmentDate: booking.appointmentDate.toISOString().split("T")[0],
    appointmentTime: booking.appointmentTime,
    durationMin: booking.durationMin,
    services: booking.services.map((s) => ({
      name: s.service.name,
      category: s.service.category,
      pricePence: s.pricePence,
      priceFormatted: penceToPounds(s.pricePence),
    })),
    addOns: booking.addOns.map((a) => ({
      name: a.service.name,
      pricePence: a.pricePence,
      priceFormatted: penceToPounds(a.pricePence),
    })),
    totalPence: booking.totalPence,
    totalFormatted: penceToPounds(booking.totalPence),
    depositPence: booking.depositPence,
    depositFormatted: penceToPounds(booking.depositPence),
    remainingPence: booking.remainingPence,
    remainingFormatted: penceToPounds(booking.remainingPence),
    depositPaidAt: booking.depositPaidAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
  };
}
