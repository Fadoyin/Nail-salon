"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminAuth } from "@/lib/admin-auth";
import { api, type AdminBooking, type BlockedDate, type BusinessHour } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

type AdminTab = "bookings" | "availability" | "payments";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { admin, token, loading: authLoading, logout } = useAdminAuth();
  const [tab, setTab] = useState<AdminTab>("bookings");
  const [stats, setStats] = useState<Record<string, string | number> | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [blockDateInput, setBlockDateInput] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!authLoading && !admin) router.push("/admin/login");
  }, [authLoading, admin, router]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsData, bookingsData] = await Promise.all([
        api.adminGetStats(token) as Promise<Record<string, string | number>>,
        api.adminGetBookings(token),
      ]);
      setStats(statsData);
      setBookings(bookingsData.bookings);

      if (tab === "availability") {
        const [blocked, hoursData] = await Promise.all([
          api.adminGetBlockedDates(token),
          api.adminGetHours(token),
        ]);
        setBlockedDates(blocked.blockedDates);
        setHours(hoursData.hours);
      }
    } catch {
      logout();
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, tab]);

  const handleBlockDate = async () => {
    if (!token || !blockDateInput) return;
    await api.adminBlockDate(token, blockDateInput, blockReason || undefined);
    setBlockDateInput("");
    setBlockReason("");
    setMessage("Date blocked");
    const data = await api.adminGetBlockedDates(token);
    setBlockedDates(data.blockedDates);
  };

  const handleUnblock = async (id: string) => {
    if (!token) return;
    await api.adminUnblockDate(token, id);
    setMessage("Date unblocked");
    const data = await api.adminGetBlockedDates(token);
    setBlockedDates(data.blockedDates);
  };

  const handleSaveHours = async () => {
    if (!token) return;
    await api.adminUpdateHours(token, hours);
    setMessage("Business hours updated");
  };

  const handleComplete = async (reference: string) => {
    if (!token) return;
    await api.adminCompleteBooking(token, reference);
    setMessage(`Marked ${reference} as completed`);
    loadData();
  };

  if (authLoading || !admin) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-blush bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-deep-pink">🌸 Dollhouse Lounge Admin</h1>
            <p className="text-xs text-foreground/50">Welcome, {admin.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-foreground/50 hover:text-hot-pink">View Site</Link>
            <button onClick={() => { logout(); router.push("/admin/login"); }} className="text-sm text-red-500 hover:underline">
              Log Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {message && (
          <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{message}</div>
        )}

        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total Bookings", value: stats.totalBookings },
              { label: "Confirmed", value: stats.confirmed },
              { label: "Deposits Collected", value: stats.depositsCollectedFormatted },
              { label: "Total Value", value: stats.totalValueFormatted },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-blush bg-white p-5 text-center">
                <p className="text-xl font-bold text-deep-pink">{s.value}</p>
                <p className="text-xs text-foreground/50">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mb-6 flex gap-2 overflow-x-auto">
          {(["bookings", "availability", "payments"] as AdminTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-shrink-0 rounded-full px-5 py-2 text-sm font-semibold capitalize ${
                tab === t ? "bg-deep-pink text-white" : "bg-blush text-foreground/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-foreground/50 py-12">Loading...</p>
        ) : tab === "bookings" ? (
          <div className="overflow-x-auto rounded-2xl border border-blush bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blush bg-blush/30 text-left">
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Deposit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-blush/50">
                    <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
                    <td className="px-4 py-3">
                      <div>{b.clientName}</div>
                      <div className="text-xs text-foreground/40">{b.email}</div>
                    </td>
                    <td className="px-4 py-3">{b.serviceName}</td>
                    <td className="px-4 py-3">{b.appointmentDate}<br /><span className="text-xs">{b.appointmentTime}</span></td>
                    <td className="px-4 py-3">{b.depositFormatted}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status === "CONFIRMED" ? "upcoming" : b.status.toLowerCase()} /></td>
                    <td className="px-4 py-3">
                      {b.status === "CONFIRMED" && (
                        <button onClick={() => handleComplete(b.reference)} className="text-xs font-semibold text-hot-pink hover:underline">
                          Mark Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "availability" ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-blush bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-deep-pink">Block Dates</h2>
              <p className="mt-1 text-sm text-foreground/50">Blocked dates won&apos;t appear on the booking calendar.</p>
              <div className="mt-4 space-y-3">
                <input type="date" value={blockDateInput} onChange={(e) => setBlockDateInput(e.target.value)}
                  className="w-full rounded-xl border border-blush px-4 py-2 text-sm" />
                <input type="text" placeholder="Reason (optional)" value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full rounded-xl border border-blush px-4 py-2 text-sm" />
                <button onClick={handleBlockDate} className="rounded-full bg-hot-pink px-6 py-2 text-sm font-semibold text-white">
                  Block Date
                </button>
              </div>
              <ul className="mt-6 space-y-2">
                {blockedDates.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg bg-blush/30 px-4 py-2 text-sm">
                    <span>{d.date}{d.reason && <span className="text-foreground/40"> — {d.reason}</span>}</span>
                    <button onClick={() => handleUnblock(d.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </li>
                ))}
                {blockedDates.length === 0 && <p className="text-sm text-foreground/40">No blocked dates</p>}
              </ul>
            </div>

            <div className="rounded-2xl border border-blush bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-deep-pink">Business Hours</h2>
              <div className="mt-4 space-y-3">
                {hours.map((h, i) => (
                  <div key={h.dayOfWeek} className="flex items-center gap-3 text-sm">
                    <span className="w-24 font-medium">{h.dayName}</span>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={h.isClosed}
                        onChange={(e) => {
                          const updated = [...hours];
                          updated[i] = { ...h, isClosed: e.target.checked };
                          setHours(updated);
                        }} />
                      Closed
                    </label>
                    {!h.isClosed && (
                      <>
                        <input type="time" value={h.openTime}
                          onChange={(e) => { const u = [...hours]; u[i] = { ...h, openTime: e.target.value }; setHours(u); }}
                          className="rounded border border-blush px-2 py-1" />
                        <span>–</span>
                        <input type="time" value={h.closeTime}
                          onChange={(e) => { const u = [...hours]; u[i] = { ...h, closeTime: e.target.value }; setHours(u); }}
                          className="rounded border border-blush px-2 py-1" />
                      </>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={handleSaveHours} className="mt-4 rounded-full bg-hot-pink px-6 py-2 text-sm font-semibold text-white">
                Save Hours
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-blush bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-deep-pink">Payments</h2>
            <p className="mt-2 text-sm text-foreground/60">
              Deposits collected: <strong className="text-deep-pink">{stats?.depositsCollectedFormatted as string}</strong>
            </p>
            <p className="mt-1 text-sm text-foreground/60">
              Total booking value: <strong>{stats?.totalValueFormatted as string}</strong>
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blush text-left">
                    <th className="py-2">Reference</th>
                    <th className="py-2">Client</th>
                    <th className="py-2">Deposit</th>
                    <th className="py-2">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.filter((b) => b.depositPaidAt).map((b) => (
                    <tr key={b.id} className="border-b border-blush/50">
                      <td className="py-2 font-mono text-xs">{b.reference}</td>
                      <td className="py-2">{b.clientName}</td>
                      <td className="py-2">{b.depositFormatted}</td>
                      <td className="py-2 text-xs text-foreground/50">{b.depositPaidAt ? new Date(b.depositPaidAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
