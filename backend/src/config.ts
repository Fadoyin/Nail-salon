import "dotenv/config";

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  timezone: process.env.SALON_TIMEZONE ?? "Europe/London",
  depositPercentage: parseInt(process.env.DEPOSIT_PERCENTAGE ?? "50", 10),
  cancellationHours: parseInt(process.env.CANCELLATION_HOURS ?? "48", 10),
  trustpilotUrl: process.env.TRUSTPILOT_REVIEW_URL ?? "https://www.trustpilot.com",
  jwt: {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  },
  email: {
    host: process.env.SMTP_HOST ?? "",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.EMAIL_FROM ?? "Dollhouse Lounge <bookings@dollhouselounge.com>",
  },
  isStripeConfigured: () => Boolean(process.env.STRIPE_SECRET_KEY),
  isEmailConfigured: () =>
    Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
};

export const CANCELLATION_POLICY = `Cancellation Policy — Dollhouse Lounge

A 50% deposit is required at the time of booking to secure your appointment.

• More than 48 hours before your appointment: Your full deposit will be refunded.
• Within 48 hours of your appointment: Your deposit is non-refundable.

By booking, you acknowledge and agree to this cancellation policy.`;
