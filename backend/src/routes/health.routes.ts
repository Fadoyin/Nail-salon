import { Router } from "express";
import { config } from "../config.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "Dollhouse Lounge API",
    version: "1.0.0",
    features: {
      stripe: config.isStripeConfigured(),
      email: config.isEmailConfigured(),
    },
  });
});

export default router;
