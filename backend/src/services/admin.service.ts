import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signAdminToken } from "../lib/jwt.js";
import { AppError } from "../lib/errors.js";
import { penceToPounds } from "../utils/money.js";
import { format } from "date-fns";

const SALT_ROUNDS = 12;

export async function loginAdmin(email: string, password: string) {
  const admin = await prisma.admin.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!admin) {
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const token = signAdminToken(admin.id, admin.email);

  return {
    admin: { id: admin.id, email: admin.email, name: admin.name },
    token,
  };
}

export async function getAdminStats() {
  const [totalBookings, confirmed, cancelled, completed, revenue] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.aggregate({
      where: { depositPaidAt: { not: null }, status: { not: "CANCELLED" } },
      _sum: { depositPence: true, totalPence: true },
    }),
  ]);

  return {
    totalBookings,
    confirmed,
    cancelled,
    completed,
    depositsCollectedPence: revenue._sum.depositPence ?? 0,
    depositsCollectedFormatted: penceToPounds(revenue._sum.depositPence ?? 0),
    totalValuePence: revenue._sum.totalPence ?? 0,
    totalValueFormatted: penceToPounds(revenue._sum.totalPence ?? 0),
  };
}

export async function getAllBookings(status?: string) {
  const bookings = await prisma.booking.findMany({
    where: status ? { status: status as "CONFIRMED" } : undefined,
    include: {
      services: { include: { service: true } },
      addOns: { include: { service: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
  });

  return bookings.map((b) => ({
    id: b.id,
    reference: b.reference,
    status: b.status,
    clientName: `${b.firstName} ${b.lastName}`,
    email: b.email,
    phone: b.phone,
    serviceName: b.services.map((s) => s.service.name).join(", "),
    appointmentDate: format(b.appointmentDate, "yyyy-MM-dd"),
    appointmentTime: b.appointmentTime,
    totalFormatted: penceToPounds(b.totalPence),
    depositFormatted: penceToPounds(b.depositPence),
    depositPaidAt: b.depositPaidAt?.toISOString() ?? null,
    hasAccount: Boolean(b.userId),
    createdAt: b.createdAt.toISOString(),
  }));
}

export async function createAdminIfNotExists(email: string, password: string, name: string) {
  const existing = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return prisma.admin.create({
    data: { email: email.toLowerCase(), passwordHash, name },
  });
}
