import { z } from "zod";

export const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  addOnIds: z.array(z.string()).optional().default([]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  notes: z.string().max(500).optional(),
  policyAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the cancellation policy" }),
  }),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});
