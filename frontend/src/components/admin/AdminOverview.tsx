"use client";

import type { AdminOverview as AdminOverviewData } from "@/lib/api";
import type { AdminSection } from "./AdminLayout";

export function AdminOverview({
  data,
  onNavigate,
}: {
  data: AdminOverviewData;
  onNavigate: (s: AdminSection) => void;
}) {
  const { stats, todaySchedule } = data;
  const cards = [
    { label: "Bookings Today", value: stats.bookingsToday },
    { label: "Bookings This Week", value: stats.bookingsWeek },
    { label: "Bookings This Month", value: stats.bookingsMonth },
    { label: "Revenue Today", value: stats.revenueTodayFormatted },
    { label: "Revenue This Week", value: stats.revenueWeekFormatted },
    { label: "Revenue This Month", value: stats.revenueMonthFormatted },
    { label: "New Clients (Week)", value: stats.newClientsWeek },
    { label: "Cancellations (Month)", value: stats.cancellationsMonth },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold text-deep-pink">Overview</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-blush bg-white p-4">
            <p className="text-xl font-bold text-deep-pink">{c.value}</p>
            <p className="text-xs text-foreground/50">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => onNavigate("appointments")} className="rounded-full bg-hot-pink px-4 py-2 text-sm font-semibold text-white">Add Manual Booking</button>
        <button onClick={() => onNavigate("availability")} className="rounded-full border border-hot-pink px-4 py-2 text-sm font-semibold text-hot-pink">Block a Date</button>
        <button onClick={() => onNavigate("appointments")} className="rounded-full border border-blush px-4 py-2 text-sm font-semibold text-foreground/70">
          Pending: {stats.pendingBookings}
        </button>
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-deep-pink">Today&apos;s Schedule</h2>
        {todaySchedule.length === 0 ? (
          <p className="text-sm text-foreground/50">No appointments today</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-blush bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blush bg-blush/30 text-left">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Deposit</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {todaySchedule.map((row) => (
                  <tr key={row.reference} className="border-b border-blush/50">
                    <td className="px-4 py-3">{row.clientName}</td>
                    <td className="px-4 py-3">{row.service}</td>
                    <td className="px-4 py-3">{row.time}</td>
                    <td className="px-4 py-3">{row.depositFormatted} {row.depositPaid ? "✓" : "—"}</td>
                    <td className="px-4 py-3 capitalize">{row.status.toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
