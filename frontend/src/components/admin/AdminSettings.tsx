"use client";

import { useState, useEffect, useRef } from "react";
import { api, API_URL, type AdminSettings as SettingsType, type EmailTemplate } from "@/lib/api";

const TEMPLATE_LABELS: Record<keyof SettingsType["templates"], string> = {
  bookingConfirm: "Booking Confirmation",
  reminder: "Appointment Reminder",
  review: "Review Request",
  cancellation: "Cancellation",
};

const EMAIL_TOGGLE_LABELS: Record<string, string> = {
  emailBookingConfirm: "Booking confirmation",
  emailReminder: "Appointment reminder",
  emailReviewRequest: "Review request",
  emailCancellation: "Cancellation notice",
};

export function AdminSettings({ token, onProfileUpdate }: { token: string; onProfileUpdate: (name: string) => void }) {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [profile, setProfile] = useState({ name: "", email: "", currentPassword: "", newPassword: "" });
  const [business, setBusiness] = useState({ businessName: "", contactEmail: "", trustpilotUrl: "", instagramUrl: "", tiktokUrl: "", facebookUrl: "" });
  const [booking, setBooking] = useState({ depositPercentage: 50, cancellationHours: 48 });
  const [emailToggles, setEmailToggles] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<SettingsType["templates"] | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<keyof SettingsType["templates"]>("bookingConfirm");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.adminGetSettings(token).then((s) => {
      setSettings(s);
      setProfile((p) => ({ ...p, name: s.profile.name, email: s.profile.email }));
      setBusiness({
        businessName: String(s.business.businessName ?? ""),
        contactEmail: String(s.business.contactEmail ?? ""),
        trustpilotUrl: String(s.business.trustpilotUrl ?? ""),
        instagramUrl: String(s.business.instagramUrl ?? ""),
        tiktokUrl: String(s.business.tiktokUrl ?? ""),
        facebookUrl: String(s.business.facebookUrl ?? ""),
      });
      setBooking({ depositPercentage: s.booking.depositPercentage, cancellationHours: s.booking.cancellationHours });
      setEmailToggles(s.email);
      setTemplates(s.templates);
    });
  }, [token]);

  if (!settings || !templates) return <p className="text-foreground/50">Loading...</p>;

  const logoSrc = settings.business.logoUrl
    ? settings.business.logoUrl.startsWith("http")
      ? settings.business.logoUrl
      : `${API_URL}${settings.business.logoUrl}`
    : null;

  const saveProfile = async () => {
    await api.adminUpdateProfile(token, profile);
    setMsg("Profile updated");
    onProfileUpdate(profile.name);
  };

  const saveBusiness = async () => {
    await api.adminUpdateBusinessSettings(token, { ...business, ...booking, ...emailToggles });
    setMsg("Business settings saved");
  };

  const saveTemplates = async () => {
    await api.adminUpdateEmailTemplates(token, templates);
    setMsg("Email templates saved");
  };

  const updateTemplate = (key: keyof SettingsType["templates"], field: keyof EmailTemplate, value: string) => {
    setTemplates((t) => t ? { ...t, [key]: { ...t[key], [field]: value } } : t);
  };

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await api.adminUploadLogo(token, file);
      setSettings((s) => s ? { ...s, business: { ...s.business, logoUrl: result.logoUrl } } : s);
      setMsg("Logo uploaded");
    } catch {
      setMsg("Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="font-display text-2xl font-bold text-deep-pink">Settings</h1>
      {msg && <p className="text-sm text-green-600">{msg}</p>}

      <section className="rounded-2xl border border-blush bg-white p-6">
        <h2 className="font-semibold text-deep-pink">Logo & Branding</h2>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-blush bg-blush/20">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="Salon logo" className="max-h-20 max-w-20 object-contain" />
            ) : (
              <span className="text-3xl">🌸</span>
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleLogoUpload(f);
            }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-full bg-hot-pink px-6 py-2 text-sm text-white disabled:opacity-60">
              {uploading ? "Uploading..." : "Upload Logo"}
            </button>
            <p className="mt-2 text-xs text-foreground/40">PNG, SVG, JPG or WEBP · max 2MB</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-blush bg-white p-6">
        <h2 className="font-semibold text-deep-pink">Profile</h2>
        <div className="mt-4 space-y-3">
          <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Name" className="w-full rounded-xl border border-blush px-4 py-2 text-sm" />
          <input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email" className="w-full rounded-xl border border-blush px-4 py-2 text-sm" />
          <input type="password" value={profile.currentPassword} onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })} placeholder="Current password (to change)" className="w-full rounded-xl border border-blush px-4 py-2 text-sm" />
          <input type="password" value={profile.newPassword} onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })} placeholder="New password" className="w-full rounded-xl border border-blush px-4 py-2 text-sm" />
          <button onClick={saveProfile} className="rounded-full bg-hot-pink px-6 py-2 text-sm text-white">Save Profile</button>
        </div>
      </section>

      <section className="rounded-2xl border border-blush bg-white p-6">
        <h2 className="font-semibold text-deep-pink">Business & Booking</h2>
        <div className="mt-4 grid gap-3">
          <input value={business.businessName} onChange={(e) => setBusiness({ ...business, businessName: e.target.value })} placeholder="Business name" className="rounded-xl border border-blush px-4 py-2 text-sm" />
          <input value={business.contactEmail} onChange={(e) => setBusiness({ ...business, contactEmail: e.target.value })} placeholder="Contact email" className="rounded-xl border border-blush px-4 py-2 text-sm" />
          <input value={business.trustpilotUrl} onChange={(e) => setBusiness({ ...business, trustpilotUrl: e.target.value })} placeholder="Trustpilot URL" className="rounded-xl border border-blush px-4 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input value={business.instagramUrl} onChange={(e) => setBusiness({ ...business, instagramUrl: e.target.value })} placeholder="Instagram URL" className="rounded-xl border border-blush px-4 py-2 text-sm" />
            <input value={business.tiktokUrl} onChange={(e) => setBusiness({ ...business, tiktokUrl: e.target.value })} placeholder="TikTok URL" className="rounded-xl border border-blush px-4 py-2 text-sm" />
          </div>
          <input value={business.facebookUrl} onChange={(e) => setBusiness({ ...business, facebookUrl: e.target.value })} placeholder="Facebook URL" className="rounded-xl border border-blush px-4 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Deposit %
              <input type="number" value={booking.depositPercentage} onChange={(e) => setBooking({ ...booking, depositPercentage: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-blush px-3 py-2" />
            </label>
            <label className="text-sm">Cancel window (hrs)
              <input type="number" value={booking.cancellationHours} onChange={(e) => setBooking({ ...booking, cancellationHours: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-blush px-3 py-2" />
            </label>
          </div>
          <button onClick={saveBusiness} className="rounded-full bg-hot-pink px-6 py-2 text-sm text-white">Save Business Settings</button>
        </div>
      </section>

      <section className="rounded-2xl border border-blush bg-white p-6">
        <h2 className="font-semibold text-deep-pink">Automated Emails</h2>
        <div className="mt-4 space-y-2 text-sm">
          {Object.entries(emailToggles).map(([key, val]) => (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" checked={val} onChange={(e) => setEmailToggles({ ...emailToggles, [key]: e.target.checked })} />
              {EMAIL_TOGGLE_LABELS[key] ?? key}
            </label>
          ))}
        </div>
        <button onClick={saveBusiness} className="mt-4 rounded-full border border-hot-pink px-6 py-2 text-sm font-semibold text-hot-pink">Save Email Toggles</button>
      </section>

      <section className="rounded-2xl border border-blush bg-white p-6">
        <h2 className="font-semibold text-deep-pink">Email Templates</h2>
        <p className="mt-1 text-xs text-foreground/50">{settings.placeholderHint}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(TEMPLATE_LABELS) as (keyof SettingsType["templates"])[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTemplate(key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${activeTemplate === key ? "bg-hot-pink text-white" : "bg-blush text-deep-pink"}`}
            >
              {TEMPLATE_LABELS[key]}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">Subject
            <input
              value={templates[activeTemplate].subject}
              onChange={(e) => updateTemplate(activeTemplate, "subject", e.target.value)}
              className="mt-1 w-full rounded-xl border border-blush px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium">Body (HTML)
            <textarea
              value={templates[activeTemplate].body}
              onChange={(e) => updateTemplate(activeTemplate, "body", e.target.value)}
              rows={12}
              className="mt-1 w-full rounded-xl border border-blush px-4 py-2 font-mono text-xs"
            />
          </label>
        </div>
        <button onClick={saveTemplates} className="mt-4 rounded-full bg-hot-pink px-6 py-2 text-sm text-white">Save Templates</button>
      </section>
    </div>
  );
}
