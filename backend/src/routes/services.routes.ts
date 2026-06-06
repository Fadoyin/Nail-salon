import { Router } from "express";
import type { ServiceCategory } from "@prisma/client";
import { getAllServices, getAddOns } from "../services/services.service.js";
import { asyncHandler } from "../lib/errors.js";

const router = Router();

const VALID_CATEGORIES = [
  "NAILS",
  "TOE_NAILS",
  "LASHES",
  "EYEBROWS",
  "PEDICURE",
  "MANICURE",
  "ADD_ONS",
] as const;

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const category = req.query.category as string | undefined;

    if (category && !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      res.status(400).json({
        error: "Invalid category",
        validCategories: VALID_CATEGORIES,
      });
      return;
    }

    const data = await getAllServices(category as ServiceCategory | undefined);
    res.json(data);
  })
);

router.get(
  "/add-ons",
  asyncHandler(async (_req, res) => {
    const addOns = await getAddOns();
    res.json({ addOns });
  })
);

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    res.json({
      categories: [
        { id: "NAILS", label: "Nails" },
        { id: "TOE_NAILS", label: "Toe Nails" },
        { id: "LASHES", label: "Lashes" },
        { id: "EYEBROWS", label: "Eyebrows" },
        { id: "PEDICURE", label: "Pedicure" },
        { id: "MANICURE", label: "Manicure" },
      ],
    });
  })
);

export default router;
