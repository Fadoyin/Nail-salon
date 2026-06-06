import Stripe from "stripe";
import { config } from "../config.js";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!config.isStripeConfigured()) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey);
  }
  return stripeClient;
}
