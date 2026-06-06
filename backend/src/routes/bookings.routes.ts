import { Router } from "express";
import {
  createBooking,
  getBookingByReference,
  cancelBooking,
  confirmBookingPayment,
} from "../services/booking.service.js";
import { createBookingSchema, cancelBookingSchema } from "../validators/booking.validator.js";
import { asyncHandler } from "../lib/errors.js";
import { optionalAuth, type AuthRequest } from "../middleware/auth.middleware.js";
import { CANCELLATION_POLICY, config } from "../config.js";

const router = Router();

router.get(
  "/policy",
  asyncHandler(async (_req, res) => {
    res.json({
      policy: CANCELLATION_POLICY,
      depositPercentage: config.depositPercentage,
      cancellationHours: config.cancellationHours,
    });
  })
);

router.post(
  "/",
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const input = createBookingSchema.parse(req.body);
    const result = await createBooking({
      ...input,
      userId: req.user?.userId,
    });
    res.status(201).json(result);
  })
);

router.get(
  "/:reference",
  asyncHandler(async (req, res) => {
    const reference = String(req.params.reference);
    const booking = await getBookingByReference(reference);
    res.json({ booking });
  })
);

router.post(
  "/:reference/cancel",
  asyncHandler(async (req, res) => {
    const reference = String(req.params.reference);
    const { reason } = cancelBookingSchema.parse(req.body);
    const result = await cancelBooking(reference, reason);
    res.json(result);
  })
);

router.post(
  "/confirm-payment",
  asyncHandler(async (req, res) => {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      res.status(400).json({ error: "paymentIntentId is required" });
      return;
    }
    const result = await confirmBookingPayment(paymentIntentId);
    res.json(result);
  })
);

export default router;
