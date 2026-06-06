export const EMAIL_PLACEHOLDER_HINT =
  "Placeholders: {{firstName}}, {{reference}}, {{date}}, {{time}}, {{services}}, {{addOns}}, {{total}}, {{deposit}}, {{remaining}}, {{cancellationPolicy}}, {{trustpilotUrl}}, {{businessName}}";

export const DEFAULT_TEMPLATES = {
  bookingConfirm: {
    subject: "Booking Confirmed — {{reference}} | {{businessName}} 🌸",
    body: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="background: linear-gradient(135deg, #fce4ec, #f8bbd9); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #c2185b; margin: 0; font-size: 28px;">{{businessName}} 🌸</h1>
    <p style="color: #880e4f; margin: 8px 0 0;">You're booked & paid!</p>
  </div>
  <div style="padding: 32px; background: #fff; border: 1px solid #f8bbd9;">
    <p>Dear {{firstName}},</p>
    <p>Thank you for booking with {{businessName}}. Your appointment is confirmed!</p>
    <div style="background: #fce4ec; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <h2 style="color: #c2185b; margin-top: 0; font-size: 18px;">Booking Reference: {{reference}}</h2>
      <p><strong>Date:</strong> {{date}}</p>
      <p><strong>Time:</strong> {{time}}</p>
      <p><strong>Services:</strong></p>
      <ul>{{services}}</ul>
      {{addOnsSection}}
    </div>
    <div style="background: #fff3f8; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <h3 style="color: #c2185b; margin-top: 0;">Payment Summary</h3>
      <p><strong>Total:</strong> {{total}}</p>
      <p><strong>Deposit paid today:</strong> {{deposit}}</p>
      <p><strong>Remaining on the day:</strong> {{remaining}}</p>
    </div>
    <div style="background: #fafafa; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #e91e63;">
      <h3 style="color: #c2185b; margin-top: 0;">Cancellation Policy</h3>
      <pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.6;">{{cancellationPolicy}}</pre>
    </div>
    <p>We can't wait to see you! If you have any questions, simply reply to this email.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="{{trustpilotUrl}}" style="display: inline-block; background: #e91e63; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-weight: bold;">Leave us a review on Trustpilot ⭐</a>
    </div>
  </div>
</div>`,
  },
  reminder: {
    subject: "Appointment Reminder — {{reference}} | {{businessName}} 🌸",
    body: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #c2185b;">Reminder: your appointment is coming up 🌸</h1>
  <p>Hi {{firstName}},</p>
  <p>This is a friendly reminder about your appointment at {{businessName}}.</p>
  <p><strong>Reference:</strong> {{reference}}<br/><strong>Date:</strong> {{date}}<br/><strong>Time:</strong> {{time}}</p>
  <p><strong>Services:</strong> {{servicesPlain}}</p>
  <p>We look forward to seeing you!</p>
</div>`,
  },
  review: {
    subject: "How was your visit? — {{businessName}} 🌸",
    body: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #c2185b;">Thank you, {{firstName}}! 🌸</h1>
  <p>We hope you loved your visit to {{businessName}}.</p>
  <p>We'd be so grateful if you could share your experience on Trustpilot — it helps other clients find us!</p>
  <a href="{{trustpilotUrl}}" style="display: inline-block; background: #e91e63; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none;">Leave a Review ⭐</a>
</div>`,
  },
  cancellation: {
    subject: "Booking Cancelled — {{reference}} | {{businessName}} 🌸",
    body: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #c2185b;">Booking Cancelled</h1>
  <p>Hi {{firstName}},</p>
  <p>Your appointment ({{reference}}) on {{date}} at {{time}} has been cancelled.</p>
  <p>If you have any questions, please contact us at {{contactEmail}}.</p>
</div>`,
  },
} as const;
