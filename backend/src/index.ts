import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler } from "./lib/errors.js";
import healthRoutes from "./routes/health.routes.js";
import servicesRoutes from "./routes/services.routes.js";
import availabilityRoutes from "./routes/availability.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import webhooksRoutes from "./routes/webhooks.routes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

// Stripe webhooks need raw body — mount before json parser
app.use("/api/webhooks", webhooksRoutes);

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Dollhouse Lounge API — backend is running 🌸",
    note: "This is the API server. The website frontend is not built yet.",
    tryThese: {
      health: "/api/health",
      services: "/api/services",
      availability: "/api/availability/calendar?month=2026-06&durationMin=60",
      bookingPolicy: "/api/bookings/policy",
      register: "/api/auth/register",
      login: "/api/auth/login",
      dashboard: "/api/dashboard/overview",
    },
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/bookings", bookingsRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🌸 Dollhouse Lounge API running on http://localhost:${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Stripe: ${config.isStripeConfigured() ? "configured" : "not configured"}`);
  console.log(`   Email:  ${config.isEmailConfigured() ? "configured" : "not configured"}`);
});

export default app;
