import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/errors.js";
import { requireAdmin, type AuthRequest } from "../middleware/auth.middleware.js";
import { loginSchema } from "../validators/auth.validator.js";
import { loginAdmin, getAdminStats, getAllBookings } from "../services/admin.service.js";
import {
  getBlockedDates,
  blockDate,
  unblockDate,
  updateBusinessHours,
  markBookingCompleted,
} from "../services/availability-admin.service.js";

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

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const stats = await getAdminStats();
    res.json(stats);
  })
);

router.get(
  "/bookings",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const bookings = await getAllBookings(status);
    res.json({ bookings });
  })
);

router.patch(
  "/bookings/:reference/complete",
  asyncHandler(async (req, res) => {
    const result = await markBookingCompleted(String(req.params.reference));
    res.json(result);
  })
);

router.get(
  "/availability/blocked",
  asyncHandler(async (_req, res) => {
    const dates = await getBlockedDates();
    res.json({ blockedDates: dates });
  })
);

router.post(
  "/availability/blocked",
  asyncHandler(async (req, res) => {
    const { date, reason } = req.body;
    const result = await blockDate(date, reason);
    res.status(201).json(result);
  })
);

router.delete(
  "/availability/blocked/:id",
  asyncHandler(async (req, res) => {
    const result = await unblockDate(String(req.params.id));
    res.json(result);
  })
);

router.get(
  "/availability/hours",
  asyncHandler(async (_req, res) => {
    const { getBusinessHours } = await import("../services/availability.service.js");
    const hours = await getBusinessHours();
    res.json({ hours });
  })
);

router.put(
  "/availability/hours",
  asyncHandler(async (req, res) => {
    const hours = businessHoursSchema.parse(req.body.hours);
    const result = await updateBusinessHours(hours);
    res.json({ hours: result });
  })
);

router.get(
  "/me",
  asyncHandler(async (req: AuthRequest, res) => {
    res.json({ admin: req.admin });
  })
);

export default router;
