import {
  addMinutes,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isBefore,
  isAfter,
  differenceInHours,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { AppError } from "../lib/errors.js";
import { getSalonSettings } from "./salon-settings.service.js";

const SLOT_INTERVAL_MIN = 30;

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDisplayTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 || 12;
  return minutes === 0
    ? `${displayHours}:00${period}`
    : `${displayHours}:${String(minutes).padStart(2, "0")}${period}`;
}

type BlockedSlot = { startTime: string; endTime: string };

function isSlotBlockedByTimeSlot(slotStart: number, slotEnd: number, blocked: BlockedSlot[]): boolean {
  return blocked.some((b) => {
    const bStart = parseTimeToMinutes(b.startTime);
    const bEnd = parseTimeToMinutes(b.endTime);
    return slotStart < bEnd && slotEnd > bStart;
  });
}

function generateSlotsForDay(
  openTime: string,
  closeTime: string,
  durationMin: number,
  existingBookings: { appointmentTime: string; durationMin: number }[],
  blockedTimeSlots: BlockedSlot[],
  bufferMinutes: number
) {
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);
  const slots: { time: string; displayTime: string }[] = [];

  for (let start = openMinutes; start + durationMin <= closeMinutes; start += SLOT_INTERVAL_MIN) {
    const slotTime = minutesToTime(start);
    const slotEnd = start + durationMin;

    const hasBookingConflict = existingBookings.some((booking) => {
      const bookingStart = parseTimeToMinutes(booking.appointmentTime);
      const bookingEnd = bookingStart + booking.durationMin + bufferMinutes;
      return start < bookingEnd && slotEnd + bufferMinutes > bookingStart;
    });

    if (!hasBookingConflict && !isSlotBlockedByTimeSlot(start, slotEnd, blockedTimeSlots)) {
      slots.push({ time: slotTime, displayTime: formatDisplayTime(slotTime) });
    }
  }

  return slots;
}

function filterByLeadTime(
  date: string,
  slots: { time: string; displayTime: string }[],
  leadTimeHours: number
) {
  const now = toZonedTime(new Date(), config.timezone);
  return slots.filter((slot) => {
    const slotDate = fromZonedTime(parseISO(`${date}T${slot.time}:00`), config.timezone);
    return differenceInHours(slotDate, now) >= leadTimeHours;
  });
}

export async function getAvailableDates(month: string, durationMin: number) {
  const settings = await getSalonSettings();
  const monthStart = startOfMonth(parseISO(`${month}-01`));
  const monthEnd = endOfMonth(monthStart);
  const today = startOfDay(toZonedTime(new Date(), config.timezone));

  const [businessHours, blockedDates, bookings, blockedSlots] = await Promise.all([
    prisma.businessHours.findMany(),
    prisma.blockedDate.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
    prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
        appointmentDate: { gte: monthStart, lte: monthEnd },
      },
      select: { appointmentDate: true, appointmentTime: true, durationMin: true },
    }),
    prisma.blockedTimeSlot.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
    }),
  ]);

  const blockedSet = new Set(blockedDates.map((b) => format(b.date, "yyyy-MM-dd")));
  const hoursMap = new Map(businessHours.map((h) => [h.dayOfWeek, h]));
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const availableDates: string[] = [];

  for (const day of days) {
    const dateStr = format(day, "yyyy-MM-dd");
    if (isBefore(day, today)) continue;
    if (blockedSet.has(dateStr)) continue;

    const dayOfWeek = day.getDay();
    const hours = hoursMap.get(dayOfWeek);
    if (!hours || hours.isClosed) continue;

    const dayBlockedSlots = blockedSlots
      .filter((b) => format(b.date, "yyyy-MM-dd") === dateStr)
      .map((b) => ({ startTime: b.startTime, endTime: b.endTime }));

    let slots = generateSlotsForDay(
      hours.openTime,
      hours.closeTime,
      durationMin,
      bookings.filter((b) => format(b.appointmentDate, "yyyy-MM-dd") === dateStr),
      dayBlockedSlots,
      settings.bufferMinutes
    );

    slots = filterByLeadTime(dateStr, slots, settings.leadTimeHours);

    if (slots.length > 0) availableDates.push(dateStr);
  }

  return { month, availableDates };
}

export async function getAvailableSlots(date: string, durationMin: number) {
  const settings = await getSalonSettings();
  const parsedDate = parseISO(date);
  const today = startOfDay(toZonedTime(new Date(), config.timezone));

  if (isBefore(parsedDate, today)) {
    throw new AppError(400, "Cannot book appointments in the past");
  }

  const dayOfWeek = parsedDate.getDay();

  const [hours, blocked, bookings, blockedSlots] = await Promise.all([
    prisma.businessHours.findUnique({ where: { dayOfWeek } }),
    prisma.blockedDate.findFirst({ where: { date: startOfDay(parsedDate) } }),
    prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
        appointmentDate: startOfDay(parsedDate),
      },
      select: { appointmentTime: true, durationMin: true },
    }),
    prisma.blockedTimeSlot.findMany({ where: { date: startOfDay(parsedDate) } }),
  ]);

  if (blocked) return { date, slots: [] };
  if (!hours || hours.isClosed) return { date, slots: [] };

  const dayBlockedSlots = blockedSlots.map((b) => ({
    startTime: b.startTime,
    endTime: b.endTime,
  }));

  let slots = generateSlotsForDay(
    hours.openTime,
    hours.closeTime,
    durationMin,
    bookings,
    dayBlockedSlots,
    settings.bufferMinutes
  );

  slots = filterByLeadTime(date, slots, settings.leadTimeHours);

  const now = toZonedTime(new Date(), config.timezone);
  const isToday = format(parsedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

  const filteredSlots = isToday
    ? slots.filter((slot) => {
        const slotDate = fromZonedTime(parseISO(`${date}T${slot.time}:00`), config.timezone);
        return isAfter(slotDate, addMinutes(now, 60));
      })
    : slots;

  return { date, slots: filteredSlots.map((s) => ({ time: s.time, displayTime: s.displayTime })) };
}

export async function getBusinessHours() {
  const hours = await prisma.businessHours.findMany({ orderBy: { dayOfWeek: "asc" } });
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return hours.map((h) => ({
    dayOfWeek: h.dayOfWeek,
    dayName: dayNames[h.dayOfWeek],
    openTime: h.openTime,
    closeTime: h.closeTime,
    isClosed: h.isClosed,
  }));
}
