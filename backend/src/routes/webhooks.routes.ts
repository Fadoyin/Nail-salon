import { Router, raw } from "express";
import type { Request, Response } from "express";
import { getStripe } from "../lib/stripe.js";
import { config } from "../config.js";
import { confirmBookingPayment } from "../services/booking.service.js";

const router = Router();

router.post(
  "/stripe",
  raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    if (!config.isStripeConfigured()) {
      res.status(503).json({ error: "Stripe not configured" });
      return;
    }

    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];

    if (!sig || typeof sig !== "string") {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    try {
      switch (event.type) {
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;
          await confirmBookingPayment(paymentIntent.id);
          break;
        }
        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object;
          console.warn("Payment failed for intent:", paymentIntent.id);
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error("Webhook handler error:", err);
      res.status(500).json({ error: "Webhook handler failed" });
      return;
    }

    res.json({ received: true });
  }
);

export default router;
