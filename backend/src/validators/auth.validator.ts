import { z } from "zod";

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    email: z.string().email("Valid email is required"),
    phone: z.string().min(7, "Phone number is required").max(20),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
  newPassword: z.string().min(8).optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
}).refine(
  (data) => {
    if (data.newPassword && data.newPassword.length > 0) {
      return data.newPassword === data.confirmPassword;
    }
    return true;
  },
  { message: "Passwords do not match", path: ["confirmPassword"] }
);
