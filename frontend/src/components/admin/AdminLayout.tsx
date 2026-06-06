"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type AdminSection =
  | "overview"
  | "appointments"
  | "clients"
  | "payments"
  | "availability"
  | "notifications"
  | "settings";

const nav: { id: AdminSection; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "🏠" },
  { id: "appointments", label: "Appointments", icon: "📅" },
  { id: "clients", label: "Clients", icon: "👥" },
  { id: "payments", label: "Payments", icon: "💷" },
  { id: "availability", label: "Availability", icon: "📆" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export function AdminLayout({
  adminName,
  section,
  onSectionChange,
  unreadNotifications,
  onLogout,
  children,
}: {
  adminName: string;
  section: AdminSection;
  onSectionChange: (s: AdminSection) => void;
  unreadNotifications: number;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-shrink-0 border-r border-blush bg-white lg:flex lg:flex-col">
        <div className="border-b border-blush p-6">
          <p className="font-display text-lg font-bold text-deep-pink">🌸 Dollhouse Lounge</p>
          <p className="text-xs text-foreground/50">Admin Panel</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                section === item.id ? "bg-blush text-deep-pink" : "text-foreground/60 hover:bg-blush/50"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
              {item.id === "notifications" && unreadNotifications > 0 && (
                <span className="ml-auto rounded-full bg-hot-pink px-2 py-0.5 text-xs text-white">
                  {unreadNotifications}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-blush p-4">
          <p className="mb-2 truncate text-xs text-foreground/50">{adminName}</p>
          <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm text-red-500 hover:bg-red-50">
            🚪 Log Out
          </button>
          <Link href="/" className="mt-2 block px-4 text-xs text-foreground/40 hover:text-hot-pink">
            View website →
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-blush bg-white px-4 py-3 lg:hidden">
          <p className="font-display font-bold text-deep-pink">Admin</p>
          <select
            value={section}
            onChange={(e) => onSectionChange(e.target.value as AdminSection)}
            className="rounded-lg border border-blush px-2 py-1 text-sm"
          >
            {nav.map((n) => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
