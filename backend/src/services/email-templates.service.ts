import type { SalonSettings } from "@prisma/client";
import { DEFAULT_TEMPLATES } from "./email-template-defaults.js";

export type TemplateKey = "bookingConfirm" | "reminder" | "review" | "cancellation";

const DB_FIELD_MAP: Record<TemplateKey, { subject: keyof SalonSettings; body: keyof SalonSettings }> = {
  bookingConfirm: { subject: "templateBookingConfirmSubject", body: "templateBookingConfirmBody" },
  reminder: { subject: "templateReminderSubject", body: "templateReminderBody" },
  review: { subject: "templateReviewSubject", body: "templateReviewBody" },
  cancellation: { subject: "templateCancellationSubject", body: "templateCancellationBody" },
};

export function getTemplatesForAdmin(salon: SalonSettings) {
  return {
    bookingConfirm: {
      subject: salon.templateBookingConfirmSubject ?? DEFAULT_TEMPLATES.bookingConfirm.subject,
      body: salon.templateBookingConfirmBody ?? DEFAULT_TEMPLATES.bookingConfirm.body,
    },
    reminder: {
      subject: salon.templateReminderSubject ?? DEFAULT_TEMPLATES.reminder.subject,
      body: salon.templateReminderBody ?? DEFAULT_TEMPLATES.reminder.body,
    },
    review: {
      subject: salon.templateReviewSubject ?? DEFAULT_TEMPLATES.review.subject,
      body: salon.templateReviewBody ?? DEFAULT_TEMPLATES.review.body,
    },
    cancellation: {
      subject: salon.templateCancellationSubject ?? DEFAULT_TEMPLATES.cancellation.subject,
      body: salon.templateCancellationBody ?? DEFAULT_TEMPLATES.cancellation.body,
    },
  };
}

export function resolveTemplate(
  salon: SalonSettings,
  key: TemplateKey,
  vars: Record<string, string>
): { subject: string; html: string } {
  const fields = DB_FIELD_MAP[key];
  const defaults = DEFAULT_TEMPLATES[key];
  let subject = (salon[fields.subject] as string | null) ?? defaults.subject;
  let body = (salon[fields.body] as string | null) ?? defaults.body;

  for (const [k, v] of Object.entries(vars)) {
    subject = subject.replaceAll(`{{${k}}}`, v);
    body = body.replaceAll(`{{${k}}}`, v);
  }

  return { subject, html: body };
}
