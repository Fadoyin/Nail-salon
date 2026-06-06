import nodemailer from "nodemailer";
import type { Booking, BookingService, BookingAddOn, Service } from "@prisma/client";
import { config, CANCELLATION_POLICY } from "../config.js";
import { penceToPounds } from "../utils/money.js";
import { format } from "date-fns";

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

function buildBookingSummaryHtml(booking: BookingWithRelations): string {
  const serviceLines = booking.services
    .map((s) => `<li>${s.service.name} — ${penceToPounds(s.pricePence)}</li>`)
    .join("");

  const addOnLines = booking.addOns
    .map((a) => `<li>${a.service.name} — ${penceToPounds(a.pricePence)}</li>`)
    .join("");

  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: linear-gradient(135deg, #fce4ec, #f8bbd9); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #c2185b; margin: 0; font-size: 28px;">Dollhouse Lounge 🌸</h1>
        <p style="color: #880e4f; margin: 8px 0 0;">You're booked & paid!</p>
      </div>
      <div style="padding: 32px; background: #fff; border: 1px solid #f8bbd9;">
        <p>Dear ${booking.firstName},</p>
        <p>Thank you for booking with Dollhouse Lounge. Your appointment is confirmed!</p>

        <div style="background: #fce4ec; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h2 style="color: #c2185b; margin-top: 0; font-size: 18px;">Booking Reference: ${booking.reference}</h2>
          <p><strong>Date:</strong> ${formatAppointmentDate(booking.appointmentDate)}</p>
          <p><strong>Time:</strong> ${booking.appointmentTime}</p>
          <p><strong>Services:</strong></p>
          <ul>${serviceLines}</ul>
          ${addOnLines ? `<p><strong>Add-ons:</strong></p><ul>${addOnLines}</ul>` : ""}
        </div>

        <div style="background: #fff3f8; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="color: #c2185b; margin-top: 0;">Payment Summary</h3>
          <p><strong>Total:</strong> ${penceToPounds(booking.totalPence)}</p>
          <p><strong>Deposit paid today:</strong> ${penceToPounds(booking.depositPence)}</p>
          <p><strong>Remaining on the day:</strong> ${penceToPounds(booking.remainingPence)}</p>
        </div>

        <div style="background: #fafafa; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #e91e63;">
          <h3 style="color: #c2185b; margin-top: 0;">Cancellation Policy</h3>
          <pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.6;">${CANCELLATION_POLICY}</pre>
        </div>

        <p>We can't wait to see you! If you have any questions, simply reply to this email.</p>

        <div style="text-align: center; margin-top: 32px;">
          <a href="${config.trustpilotUrl}" style="display: inline-block; background: #e91e63; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-weight: bold;">
            Leave us a review on Trustpilot ⭐
          </a>
        </div>
      </div>
      <div style="text-align: center; padding: 16px; color: #999; font-size: 12px;">
        © 2026 Dollhouse Lounge
      </div>
    </div>
  `;
}

export async function sendBookingConfirmation(booking: BookingWithRelations): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.warn("Email not configured — skipping confirmation email for", booking.reference);
    return false;
  }

  const html = buildBookingSummaryHtml(booking);

  await transport.sendMail({
    from: config.email.from,
    to: booking.email,
    subject: `Booking Confirmed — ${booking.reference} | Dollhouse Lounge 🌸`,
    html,
    text: `Your appointment at Dollhouse Lounge is confirmed!\n\nReference: ${booking.reference}\nDate: ${formatAppointmentDate(booking.appointmentDate)}\nTime: ${booking.appointmentTime}\nDeposit paid: ${penceToPounds(booking.depositPence)}\nRemaining: ${penceToPounds(booking.remainingPence)}\n\n${CANCELLATION_POLICY}`,
  });

  return true;
}

export async function sendReviewRequest(booking: BookingWithRelations): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) return false;

  await transport.sendMail({
    from: config.email.from,
    to: booking.email,
    subject: "How was your visit? — Dollhouse Lounge 🌸",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #c2185b;">Thank you, ${booking.firstName}! 🌸</h1>
        <p>We hope you loved your visit to Dollhouse Lounge.</p>
        <p>We'd be so grateful if you could share your experience on Trustpilot — it helps other clients find us!</p>
        <a href="${config.trustpilotUrl}" style="display: inline-block; background: #e91e63; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none;">
          Leave a Review ⭐
        </a>
      </div>
    `,
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

  await transport.sendMail({
    from: config.email.from,
    to: email,
    subject: "Reset your password — Dollhouse Lounge 🌸",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #fce4ec, #f8bbd9); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #c2185b; margin: 0;">Dollhouse Lounge 🌸</h1>
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
    text: `Reset your Dollhouse Lounge password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });

  return true;
}
