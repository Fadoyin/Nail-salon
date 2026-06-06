import nodemailer from "nodemailer";
import type { Booking, BookingService, BookingAddOn, Service } from "@prisma/client";
import { config, CANCELLATION_POLICY } from "../config.js";
import { penceToPounds } from "../utils/money.js";
import { format } from "date-fns";
import { getSalonSettings } from "./salon-settings.service.js";
import { resolveTemplate } from "./email-templates.service.js";

type BookingWithRelations = Booking & {
  services: (BookingService & { service: Service })[];
  addOns: (BookingAddOn & { service: Service })[];
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!config.isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }
  return transporter;
}

function formatAppointmentDate(date: Date): string {
  return format(date, "EEEE, d MMMM yyyy");
}

function buildBookingVars(booking: BookingWithRelations, salon: Awaited<ReturnType<typeof getSalonSettings>>) {
  const serviceLines = booking.services
    .map((s) => `<li>${s.service.name} — ${penceToPounds(s.pricePence)}</li>`)
    .join("");
  const addOnLines = booking.addOns
    .map((a) => `<li>${a.service.name} — ${penceToPounds(a.pricePence)}</li>`)
    .join("");
  const servicesPlain = [
    ...booking.services.map((s) => s.service.name),
    ...booking.addOns.map((a) => a.service.name),
  ].join(", ");

  return {
    firstName: booking.firstName,
    reference: booking.reference,
    date: formatAppointmentDate(booking.appointmentDate),
    time: booking.appointmentTime,
    services: serviceLines,
    addOns: addOnLines,
    addOnsSection: addOnLines
      ? `<p><strong>Add-ons:</strong></p><ul>${addOnLines}</ul>`
      : "",
    servicesPlain,
    total: penceToPounds(booking.totalPence),
    deposit: penceToPounds(booking.depositPence),
    remaining: penceToPounds(booking.remainingPence),
    cancellationPolicy: CANCELLATION_POLICY,
    trustpilotUrl: salon.trustpilotUrl || config.trustpilotUrl,
    businessName: salon.businessName,
    contactEmail: salon.contactEmail,
  };
}

export async function sendBookingConfirmation(booking: BookingWithRelations): Promise<boolean> {
  const salon = await getSalonSettings();
  if (!salon.emailBookingConfirm) return false;

  const transport = getTransporter();
  if (!transport) {
    console.warn("Email not configured — skipping confirmation email for", booking.reference);
    return false;
  }

  const vars = buildBookingVars(booking, salon);
  const { subject, html } = resolveTemplate(salon, "bookingConfirm", vars);

  await transport.sendMail({
    from: config.email.from,
    to: booking.email,
    subject,
    html,
    text: `Your appointment at ${salon.businessName} is confirmed!\n\nReference: ${booking.reference}\nDate: ${vars.date}\nTime: ${booking.appointmentTime}\nDeposit paid: ${vars.deposit}\nRemaining: ${vars.remaining}\n\n${CANCELLATION_POLICY}`,
  });

  return true;
}

export async function sendAppointmentReminder(booking: BookingWithRelations): Promise<boolean> {
  const salon = await getSalonSettings();
  if (!salon.emailReminder) return false;

  const transport = getTransporter();
  if (!transport) return false;

  const vars = buildBookingVars(booking, salon);
  const { subject, html } = resolveTemplate(salon, "reminder", vars);

  await transport.sendMail({
    from: config.email.from,
    to: booking.email,
    subject,
    html,
    text: `Reminder: ${vars.date} at ${booking.appointmentTime} — ${booking.reference}`,
  });

  return true;
}

export async function sendReviewRequest(booking: BookingWithRelations): Promise<boolean> {
  const salon = await getSalonSettings();
  if (!salon.emailReviewRequest) return false;

  const transport = getTransporter();
  if (!transport) return false;

  const vars = buildBookingVars(booking, salon);
  const { subject, html } = resolveTemplate(salon, "review", vars);

  await transport.sendMail({
    from: config.email.from,
    to: booking.email,
    subject,
    html,
  });

  return true;
}

export async function sendCancellationEmail(booking: BookingWithRelations): Promise<boolean> {
  const salon = await getSalonSettings();
  if (!salon.emailCancellation) return false;

  const transport = getTransporter();
  if (!transport) return false;

  const vars = buildBookingVars(booking, salon);
  const { subject, html } = resolveTemplate(salon, "cancellation", vars);

  await transport.sendMail({
    from: config.email.from,
    to: booking.email,
    subject,
    html,
    text: `Your booking ${booking.reference} on ${vars.date} has been cancelled.`,
  });

  return true;
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetUrl: string
): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.warn("Email not configured — password reset link:", resetUrl);
    return false;
  }

  const salon = await getSalonSettings();

  await transport.sendMail({
    from: config.email.from,
    to: email,
    subject: `Reset your password — ${salon.businessName} 🌸`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #fce4ec, #f8bbd9); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #c2185b; margin: 0;">${salon.businessName} 🌸</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #f8bbd9;">
          <p>Hi ${firstName},</p>
          <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #e91e63; color: white; padding: 14px 28px; border-radius: 24px; text-decoration: none; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #999;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
    text: `Reset your ${salon.businessName} password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });

  return true;
}
