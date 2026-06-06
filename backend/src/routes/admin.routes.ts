import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/errors.js";
import { requireAdmin, type AuthRequest } from "../middleware/auth.middleware.js";
import { loginSchema } from "../validators/auth.validator.js";
import { loginAdmin } from "../services/admin.service.js";
import { getAdminOverview } from "../services/admin-overview.service.js";
import {
  getAdminBookings,
  getAdminBooking,
  updateBookingStatus,
  updateBookingNotes,
  adminRescheduleBooking,
  createManualBooking,
} from "../services/admin-appointments.service.js";
import { getAdminClients, getAdminClient, updateClientNotes } from "../services/admin-clients.service.js";
import {
  getPaymentsOverview,
  getPaymentsTable,
  issueRefund,
  exportPaymentsCsv,
  exportPaymentsPdf,
} from "../services/admin-payments.service.js";
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../services/admin-notification.service.js";
import {
  getAdminSettings,
  updateAdminProfile,
  updateBusinessSettings,
  updateEmailTemplates,
  uploadLogo,
} from "../services/admin-settings.service.js";
import { logoUpload } from "../middleware/upload.middleware.js";
import { AppError } from "../lib/errors.js";
import {
  getBlockedDates,
  blockDate,
  unblockDate,
  updateBusinessHours,
  markBookingCompleted,
  getBlockedTimeSlots,
  blockTimeSlot,
  unblockTimeSlot,
} from "../services/availability-admin.service.js";
import { cancelBooking } from "../services/booking.service.js";
import { getSalonSettings } from "../services/salon-settings.service.js";

const router = Router();

const businessHoursSchema = z.array(
  z.object({
    dayOfWeek: z.number().min(0).max(6),
    openTime: z.string(),
    closeTime: z.string(),
    isClosed: z.boolean(),
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await loginAdmin(email, password);
    res.json(result);
  })
);

router.use(requireAdmin);

// Overview
router.get("/overview", asyncHandler(async (_req, res) => {
  res.json(await getAdminOverview());
}));

// Appointments
router.get("/appointments", asyncHandler(async (req, res) => {
  const bookings = await getAdminBookings({
    status: req.query.status as string,
    category: req.query.category as string,
    search: req.query.search as string,
    dateFrom: req.query.dateFrom as string,
    dateTo: req.query.dateTo as string,
  });
  res.json({ bookings });
}));

router.get("/appointments/:reference", asyncHandler(async (req, res) => {
  res.json({ booking: await getAdminBooking(String(req.params.reference)) });
}));

router.post("/appointments/manual", asyncHandler(async (req, res) => {
  const booking = await createManualBooking(req.body);
  res.status(201).json({ booking });
}));

router.patch("/appointments/:reference/status", asyncHandler(async (req, res) => {
  const { status } = req.body;
  res.json({ booking: await updateBookingStatus(String(req.params.reference), status) });
}));

router.patch("/appointments/:reference/notes", asyncHandler(async (req, res) => {
  res.json({ booking: await updateBookingNotes(String(req.params.reference), req.body.internalNotes) });
}));

router.patch("/appointments/:reference/complete", asyncHandler(async (req, res) => {
  res.json(await markBookingCompleted(String(req.params.reference)));
}));

router.post("/appointments/:reference/reschedule", asyncHandler(async (req, res) => {
  const { date, time } = req.body;
  res.json({ booking: await adminRescheduleBooking(String(req.params.reference), date, time) });
}));

router.post("/appointments/:reference/cancel", asyncHandler(async (req, res) => {
  const result = await cancelBooking(String(req.params.reference), req.body.reason);
  res.json(result);
}));

// Clients
router.get("/clients", asyncHandler(async (req, res) => {
  const clients = await getAdminClients(req.query.search as string, req.query.sortBy as string);
  res.json({ clients });
}));

router.get("/clients/:id", asyncHandler(async (req, res) => {
  res.json({ client: await getAdminClient(String(req.params.id)) });
}));

router.patch("/clients/:id/notes", asyncHandler(async (req, res) => {
  res.json(await updateClientNotes(String(req.params.id), req.body.internalNotes));
}));

// Payments
router.get("/payments/overview", asyncHandler(async (_req, res) => {
  res.json(await getPaymentsOverview());
}));

router.get("/payments", asyncHandler(async (req, res) => {
  const payments = await getPaymentsTable({
    dateFrom: req.query.dateFrom as string,
    dateTo: req.query.dateTo as string,
  });
  res.json({ payments });
}));

router.post("/payments/:reference/refund", asyncHandler(async (req, res) => {
  res.json(await issueRefund(String(req.params.reference), req.body.amountPence, req.body.reason));
}));

router.get("/payments/export", asyncHandler(async (req, res) => {
  const csv = await exportPaymentsCsv({
    dateFrom: req.query.dateFrom as string,
    dateTo: req.query.dateTo as string,
  });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=payments.csv");
  res.send(csv);
}));

router.get("/payments/export/pdf", asyncHandler(async (req, res) => {
  const pdf = await exportPaymentsPdf({
    dateFrom: req.query.dateFrom as string,
    dateTo: req.query.dateTo as string,
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=payments.pdf");
  res.send(pdf);
}));

// Notifications
router.get("/notifications", asyncHandler(async (_req, res) => {
  res.json(await getAdminNotifications());
}));

router.patch("/notifications/read-all", asyncHandler(async (_req, res) => {
  res.json(await markAllAdminNotificationsRead());
}));

router.patch("/notifications/:id/read", asyncHandler(async (req, res) => {
  res.json({ notification: await markAdminNotificationRead(String(req.params.id)) });
}));

// Availability
router.get("/availability/blocked", asyncHandler(async (_req, res) => {
  res.json({ blockedDates: await getBlockedDates() });
}));

router.post("/availability/blocked", asyncHandler(async (req, res) => {
  res.status(201).json(await blockDate(req.body.date, req.body.reason));
}));

router.delete("/availability/blocked/:id", asyncHandler(async (req, res) => {
  res.json(await unblockDate(String(req.params.id)));
}));

router.get("/availability/blocked-slots", asyncHandler(async (_req, res) => {
  res.json({ blockedSlots: await getBlockedTimeSlots() });
}));

router.post("/availability/blocked-slots", asyncHandler(async (req, res) => {
  const { date, startTime, endTime, reason } = req.body;
  res.status(201).json(await blockTimeSlot(date, startTime, endTime, reason));
}));

router.delete("/availability/blocked-slots/:id", asyncHandler(async (req, res) => {
  res.json(await unblockTimeSlot(String(req.params.id)));
}));

router.get("/availability/hours", asyncHandler(async (_req, res) => {
  const { getBusinessHours } = await import("../services/availability.service.js");
  res.json({ hours: await getBusinessHours() });
}));

router.put("/availability/hours", asyncHandler(async (req, res) => {
  const hours = businessHoursSchema.parse(req.body.hours);
  res.json({ hours: await updateBusinessHours(hours) });
}));

router.get("/availability/settings", asyncHandler(async (_req, res) => {
  const s = await getSalonSettings();
  res.json({ bufferMinutes: s.bufferMinutes, leadTimeHours: s.leadTimeHours });
}));

router.put("/availability/settings", asyncHandler(async (req, res) => {
  const { updateSalonSettings } = await import("../services/salon-settings.service.js");
  const updated = await updateSalonSettings({
    bufferMinutes: req.body.bufferMinutes,
    leadTimeHours: req.body.leadTimeHours,
  });
  res.json(updated);
}));

// Settings
router.get("/settings", asyncHandler(async (req: AuthRequest, res) => {
  res.json(await getAdminSettings(req.admin!.adminId));
}));

router.patch("/settings/profile", asyncHandler(async (req: AuthRequest, res) => {
  res.json(await updateAdminProfile(req.admin!.adminId, req.body));
}));

router.patch("/settings/business", asyncHandler(async (req, res) => {
  res.json(await updateBusinessSettings(req.body));
}));

router.patch("/settings/email-templates", asyncHandler(async (req, res) => {
  res.json(await updateEmailTemplates(req.body));
}));

router.post("/settings/logo", (req, res, next) => {
  logoUpload.single("logo")(req, res, (err) => {
    if (err) return next(new AppError(400, err.message));
    next();
  });
}, asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "No file uploaded");
  res.json(await uploadLogo(req.file.filename));
}));

router.get("/me", asyncHandler(async (req: AuthRequest, res) => {
  res.json({ admin: req.admin });
}));

export default router;
