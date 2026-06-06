import { Router } from "express";
import { asyncHandler, AppError } from "../lib/errors.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.middleware.js";
import { getUserById } from "../services/auth.service.js";
import {
  cancelBooking,
  rescheduleBooking,
  getBookingPolicyStatus,
} from "../services/booking.service.js";
import { rescheduleBookingSchema } from "../validators/password-reset.validator.js";
import { cancelBookingSchema } from "../validators/booking.validator.js";
import {
  getDashboardOverview,
  getMyAppointments,
  getBookingHistory,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/dashboard.service.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/overview",
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await getDashboardOverview(req.user!.userId);
    res.json(data);
  })
);

router.get(
  "/appointments",
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await getMyAppointments(req.user!.userId);
    res.json(data);
  })
);

router.get(
  "/history",
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await getBookingHistory(req.user!.userId);
    res.json(data);
  })
);

router.get(
  "/notifications",
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await getNotifications(req.user!.userId);
    res.json(data);
  })
);

router.patch(
  "/notifications/read-all",
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await markAllNotificationsRead(req.user!.userId);
    res.json(result);
  })
);

router.patch(
  "/notifications/:id/read",
  asyncHandler(async (req: AuthRequest, res) => {
    try {
      const notification = await markNotificationRead(
        req.user!.userId,
        String(req.params.id)
      );
      res.json({ notification });
    } catch {
      throw new AppError(404, "Notification not found");
    }
  })
);

router.get(
  "/profile",
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await getUserById(req.user!.userId);
    res.json({ user });
  })
);

router.get(
  "/bookings/:reference/policy",
  asyncHandler(async (req: AuthRequest, res) => {
    const { prisma } = await import("../lib/prisma.js");
    const booking = await prisma.booking.findFirst({
      where: {
        reference: String(req.params.reference).toUpperCase(),
        userId: req.user!.userId,
      },
    });
    if (!booking) throw new AppError(404, "Booking not found");
    const policy = getBookingPolicyStatus(booking.appointmentDate, booking.appointmentTime);
    res.json(policy);
  })
);

router.post(
  "/bookings/:reference/cancel",
  asyncHandler(async (req: AuthRequest, res) => {
    const { reason } = cancelBookingSchema.parse(req.body);
    const result = await cancelBooking(
      String(req.params.reference),
      reason,
      req.user!.userId
    );
    res.json(result);
  })
);

router.post(
  "/bookings/:reference/reschedule",
  asyncHandler(async (req: AuthRequest, res) => {
    const { date, time } = rescheduleBookingSchema.parse(req.body);
    const result = await rescheduleBooking(
      String(req.params.reference),
      date,
      time,
      req.user!.userId
    );
    res.json(result);
  })
);

export default router;
