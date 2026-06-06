import { Router } from "express";
import {
  getAvailableDates,
  getAvailableSlots,
  getBusinessHours,
} from "../services/availability.service.js";
import { asyncHandler, AppError } from "../lib/errors.js";

const router = Router();

router.get(
  "/calendar",
  asyncHandler(async (req, res) => {
    const month = req.query.month as string;
    const durationMin = parseInt(req.query.durationMin as string, 10) || 60;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new AppError(400, "month query param required (YYYY-MM)");
    }

    const data = await getAvailableDates(month, durationMin);
    res.json(data);
  })
);

router.get(
  "/slots",
  asyncHandler(async (req, res) => {
    const date = req.query.date as string;
    const durationMin = parseInt(req.query.durationMin as string, 10) || 60;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError(400, "date query param required (YYYY-MM-DD)");
    }

    const data = await getAvailableSlots(date, durationMin);
    res.json(data);
  })
);

router.get(
  "/hours",
  asyncHandler(async (_req, res) => {
    const hours = await getBusinessHours();
    res.json({ hours });
  })
);

export default router;
