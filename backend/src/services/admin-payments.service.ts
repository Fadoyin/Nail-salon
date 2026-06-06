import { parseISO, startOfDay } from "date-fns";
import { prisma } from "../lib/prisma.js";
import { penceToPounds } from "../utils/money.js";
import { getStripe } from "../lib/stripe.js";
import { config } from "../config.js";
import { AppError } from "../lib/errors.js";
import { createAdminNotification } from "./admin-notification.service.js";
import { format } from "date-fns";
import PDFDocument from "pdfkit";

export async function getPaymentsOverview() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [weekRev, monthRev, allRev, outstanding, refunds] = await Promise.all([
    prisma.booking.aggregate({
      where: { depositPaidAt: { gte: weekAgo }, status: { not: "CANCELLED" } },
      _sum: { depositPence: true },
    }),
    prisma.booking.aggregate({
      where: { depositPaidAt: { gte: monthAgo }, status: { not: "CANCELLED" } },
      _sum: { depositPence: true },
    }),
    prisma.booking.aggregate({
      where: { depositPaidAt: { not: null }, status: { not: "CANCELLED" } },
      _sum: { depositPence: true, totalPence: true },
    }),
    prisma.booking.aggregate({
      where: { status: "CONFIRMED", depositPaidAt: { not: null } },
      _sum: { remainingPence: true },
    }),
    prisma.booking.aggregate({
      where: { refundPence: { gt: 0 } },
      _sum: { refundPence: true },
    }),
  ]);

  return {
    revenueWeekFormatted: penceToPounds(weekRev._sum.depositPence ?? 0),
    revenueMonthFormatted: penceToPounds(monthRev._sum.depositPence ?? 0),
    revenueAllTimeFormatted: penceToPounds(allRev._sum.depositPence ?? 0),
    depositsCollectedFormatted: penceToPounds(allRev._sum.depositPence ?? 0),
    outstandingFormatted: penceToPounds(outstanding._sum.remainingPence ?? 0),
    refundsIssuedFormatted: penceToPounds(refunds._sum.refundPence ?? 0),
  };
}

export async function getPaymentsTable(filters: { dateFrom?: string; dateTo?: string; status?: string }) {
  const where: Record<string, unknown> = { depositPaidAt: { not: null } };
  if (filters.dateFrom || filters.dateTo) {
    where.depositPaidAt = { not: null };
    const dateFilter: Record<string, Date> = {};
    if (filters.dateFrom) dateFilter.gte = startOfDay(parseISO(filters.dateFrom));
    if (filters.dateTo) dateFilter.lte = startOfDay(parseISO(filters.dateTo));
    where.depositPaidAt = dateFilter;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: { services: { include: { service: true } } },
    orderBy: { appointmentDate: "desc" },
  });

  return bookings.map((b) => ({
    reference: b.reference,
    client: `${b.firstName} ${b.lastName}`,
    service: b.services.map((s) => s.service.name).join(", "),
    date: format(b.appointmentDate, "yyyy-MM-dd"),
    totalFormatted: penceToPounds(b.totalPence),
    depositFormatted: penceToPounds(b.depositPence),
    remainingFormatted: penceToPounds(b.remainingPence),
    refundFormatted: b.refundPence ? penceToPounds(b.refundPence) : null,
    depositPence: b.depositPence,
    refundPence: b.refundPence ?? 0,
    status: b.status,
    paymentStatus:
      b.refundPence && b.refundPence > 0
        ? "refunded"
        : b.depositPaidAt
        ? b.status === "CONFIRMED"
          ? "deposit_paid"
          : "paid"
        : "outstanding",
  }));
}

export async function issueRefund(reference: string, amountPence?: number, reason?: string) {
  const booking = await prisma.booking.findUnique({
    where: { reference: reference.toUpperCase() },
  });
  if (!booking) throw new AppError(404, "Booking not found");
  if (!booking.depositPaidAt) throw new AppError(400, "No deposit to refund");

  const refundAmount = amountPence ?? booking.depositPence;

  if (booking.stripePaymentIntentId && config.isStripeConfigured()) {
    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
      amount: refundAmount,
    });
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      refundPence: (booking.refundPence ?? 0) + refundAmount,
      cancellationReason: reason ?? booking.cancellationReason,
      status: refundAmount >= booking.depositPence ? "CANCELLED" : booking.status,
      cancelledAt: refundAmount >= booking.depositPence ? new Date() : booking.cancelledAt,
    },
  });

  await createAdminNotification({
    type: "REFUND_ISSUED",
    title: "Refund issued",
    message: `${penceToPounds(refundAmount)} refunded for ${booking.reference}`,
    bookingId: booking.id,
    linkPath: `/admin?section=payments`,
  });

  return {
    reference: updated.reference,
    refundFormatted: penceToPounds(refundAmount),
    message: "Refund processed",
  };
}

export async function exportPaymentsCsv(filters: { dateFrom?: string; dateTo?: string }) {
  const rows = await getPaymentsTable(filters);
  const header = "Reference,Client,Service,Date,Total,Deposit,Remaining,Refund,Status\n";
  const body = rows
    .map(
      (r) =>
        `${r.reference},"${r.client}","${r.service}",${r.date},${r.totalFormatted},${r.depositFormatted},${r.remainingFormatted},${r.refundFormatted ?? ""},${r.status}`
    )
    .join("\n");
  return header + body;
}

export async function exportPaymentsPdf(filters: { dateFrom?: string; dateTo?: string }): Promise<Buffer> {
  const rows = await getPaymentsTable(filters);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).fillColor("#c2185b").text("Dollhouse Lounge — Payments Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#666").text(`Generated ${format(new Date(), "d MMM yyyy HH:mm")}`, { align: "center" });
    doc.moveDown(1.5);

    const colX = [40, 110, 200, 260, 310, 360, 410, 460];
    const headers = ["Ref", "Client", "Service", "Date", "Total", "Deposit", "Remain", "Status"];
    doc.fontSize(8).fillColor("#333").font("Helvetica-Bold");
    headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: 65, continued: false }));
    doc.moveDown(0.8);
    doc.font("Helvetica").fillColor("#444");

    for (const r of rows) {
      if (doc.y > 750) {
        doc.addPage();
        doc.fontSize(8);
      }
      const y = doc.y;
      const cells = [r.reference, r.client, r.service.slice(0, 18), r.date, r.totalFormatted, r.depositFormatted, r.remainingFormatted, r.paymentStatus];
      cells.forEach((c, i) => doc.text(String(c), colX[i], y, { width: 65, lineBreak: false }));
      doc.moveDown(1.2);
    }

    doc.end();
  });
}
