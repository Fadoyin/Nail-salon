"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Calendar,
  ClipboardList,
  Bell,
  User,
  Plus,
  LogOut,
} from "lucide-react";
import { useAuth, getAuthErrorMessage } from "@/lib/auth";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { BookingActions } from "@/components/BookingActions";
import type { DashboardSection, DashboardOverview, BookingCard, Notification } from "@/types";
import { format, parseISO, formatDistanceToNow } from "date-fns";

const navItems: { id: DashboardSection; label: string; icon: typeof Home }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "appointments", label: "My Appointments", icon: Calendar },
  { id: "history", label: "Booking History", icon: ClipboardList },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "profile", label: "My Profile", icon: User },
];

function AppointmentCard({
  booking,
  token,
  onUpdated,
}: {
  booking: BookingCard;
  token?: string;
  onUpdated?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-blush bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">{booking.serviceName}</h3>
          <p className="mt-1 text-sm text-foreground/60">
            {format(parseISO(booking.appointmentDate), "EEEE, d MMMM yyyy")} at {booking.appointmentTime}
          </p>
          <p className="text-xs text-foreground/40">{booking.reference}</p>
        </div>
        <StatusBadge status={booking.displayStatus} />
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <span>Deposit: <strong className="text-deep-pink">{booking.depositFormatted}</strong></span>
        {booking.displayStatus === "upcoming" && (
          <span>Remaining: <strong>{booking.remainingFormatted}</strong></span>
        )}
        {booking.displayStatus === "completed" && (
          <span>Total: <strong>{booking.totalFormatted}</strong></span>
        )}
      </div>
      {token && onUpdated && (
        <BookingActions booking={booking} token={token} onUpdated={onUpdated} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, loading: authLoading, logout, openAuth, refreshUser } = useAuth();
  const [section, setSection] = useState<DashboardSection>("overview");
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [upcoming, setUpcoming] = useState<BookingCard[]>([]);
  const [past, setPast] = useState<BookingCard[]>([]);
  const [history, setHistory] = useState<{ id: string; reference: string; service: string; date: string; time: string; totalFormatted: string; displayStatus: string }[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      openAuth("login");
      router.push("/");
    }
  }, [authLoading, user, openAuth, router]);

  const loadSection = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (section === "overview") {
        const data = await api.getDashboardOverview(token);
        setOverview(data);
        setUnreadCount(data.unreadNotifications);
      } else if (section === "appointments") {
        const data = await api.getAppointments(token);
        setUpcoming(data.upcoming);
        setPast(data.past);
      } else if (section === "history") {
        const data = await api.getHistory(token);
        setHistory(data.bookings);
      } else if (section === "notifications") {
        const data = await api.getNotifications(token);
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } else if (section === "profile" && user) {
        setProfileForm({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSection();
  }, [section, token, user]);

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    await api.markNotificationRead(id, token);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    await api.markAllNotificationsRead(token);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setProfileError("");
    setProfileMessage("");

    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      setProfileError("Passwords do not match");
      return;
    }

    try {
      const result = await api.updateProfile(
        {
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          email: profileForm.email,
          phone: profileForm.phone,
          newPassword: profileForm.newPassword || undefined,
          confirmPassword: profileForm.confirmPassword || undefined,
        },
        token
      );
      setProfileMessage(result.message);
      await refreshUser();
      setProfileForm((f) => ({ ...f, newPassword: "", confirmPassword: "" }));
    } catch (err) {
      setProfileError(getAuthErrorMessage(err));
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-foreground/50">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-0 px-4 py-8 sm:px-6 lg:gap-8">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <div className="sticky top-24 rounded-2xl border border-blush bg-white p-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose to-hot-pink text-xl font-bold text-white shadow-md">
              {user.initials}
            </div>
            <p className="mt-3 font-semibold text-deep-pink">{user.fullName}</p>
            <p className="text-xs text-foreground/50">{user.email}</p>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  section === item.id
                    ? "bg-blush text-deep-pink"
                    : "text-foreground/60 hover:bg-blush/50"
                }`}
              >
                <item.icon size={18} />
                {item.label}
                {item.id === "notifications" && unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-hot-pink px-2 py-0.5 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
            <Link
              href="/book"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-hot-pink hover:bg-blush/50"
            >
              <Plus size={18} />
              Book Appointment
            </Link>
          </nav>

          <button
            onClick={() => { logout(); router.push("/"); }}
            className="mt-6 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-foreground/50 hover:bg-red-50 hover:text-red-500"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2 lg:hidden w-full col-span-full">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${
              section === item.id ? "bg-hot-pink text-white" : "bg-blush text-foreground/60"
            }`}
          >
            {item.label}
            {item.id === "notifications" && unreadCount > 0 && ` (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {loading ? (
          <div className="py-20 text-center text-foreground/50">Loading...</div>
        ) : (
          <>
            {section === "overview" && overview && (
              <div className="space-y-8">
                <h1 className="font-display text-2xl font-bold text-deep-pink">{overview.greeting}</h1>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { label: "Upcoming", value: overview.stats.upcomingAppointments },
                    { label: "Completed", value: overview.stats.completedBookings },
                    { label: "Total Spent", value: overview.stats.totalSpentFormatted },
                    { label: "Your Rating", value: "—" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-blush bg-white p-5 text-center">
                      <p className="text-2xl font-bold text-deep-pink">{stat.value}</p>
                      <p className="mt-1 text-xs text-foreground/50">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {overview.nextAppointment && (
                  <div>
                    <h2 className="mb-4 font-display text-lg font-semibold text-deep-pink">Next Appointment</h2>
                    <AppointmentCard booking={overview.nextAppointment} token={token!} onUpdated={loadSection} />
                  </div>
                )}

                {overview.recentActivity.length > 0 && (
                  <div>
                    <h2 className="mb-4 font-display text-lg font-semibold text-deep-pink">Recent Activity</h2>
                    <div className="space-y-3">
                      {overview.recentActivity.map((b) => (
                        <AppointmentCard key={b.id} booking={b} token={token!} onUpdated={loadSection} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {section === "appointments" && (
              <div className="space-y-8">
                <h1 className="font-display text-2xl font-bold text-deep-pink">My Appointments</h1>

                <div>
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/50">Upcoming</h2>
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-foreground/50">No upcoming appointments</p>
                  ) : (
                    <div className="space-y-3">
                      {upcoming.map((b) => <AppointmentCard key={b.id} booking={b} token={token!} onUpdated={loadSection} />)}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/50">Past</h2>
                  {past.length === 0 ? (
                    <p className="text-sm text-foreground/50">No past appointments yet</p>
                  ) : (
                    <div className="space-y-3">
                      {past.map((b) => <AppointmentCard key={b.id} booking={b} />)}
                    </div>
                  )}
                </div>

                <Link
                  href="/book"
                  className="inline-block rounded-full bg-hot-pink px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-deep-pink"
                >
                  Book New Appointment
                </Link>
              </div>
            )}

            {section === "history" && (
              <div>
                <h1 className="mb-6 font-display text-2xl font-bold text-deep-pink">Booking History</h1>
                <div className="overflow-x-auto rounded-2xl border border-blush bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-blush bg-blush/30 text-left">
                        <th className="px-4 py-3 font-semibold">Service</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Time</th>
                        <th className="px-4 py-3 font-semibold">Total</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-foreground/50">
                            No bookings yet
                          </td>
                        </tr>
                      ) : (
                        history.map((row) => (
                          <tr key={row.id} className="border-b border-blush/50 last:border-0">
                            <td className="px-4 py-3">{row.service}</td>
                            <td className="px-4 py-3">{row.date}</td>
                            <td className="px-4 py-3">{row.time}</td>
                            <td className="px-4 py-3 font-semibold">{row.totalFormatted}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={row.displayStatus} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === "notifications" && (
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <h1 className="font-display text-2xl font-bold text-deep-pink">Notifications</h1>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-sm font-semibold text-hot-pink hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <p className="text-foreground/50">No notifications yet</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.read && handleMarkRead(n.id)}
                        className={`cursor-pointer rounded-2xl border bg-white p-5 transition ${
                          n.read
                            ? "border-blush"
                            : "border-l-4 border-l-hot-pink border-blush shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="font-semibold text-foreground">{n.title}</h3>
                          <span className="flex-shrink-0 text-xs text-foreground/40">
                            {formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-foreground/60">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {section === "profile" && (
              <div className="max-w-lg">
                <h1 className="mb-6 font-display text-2xl font-bold text-deep-pink">My Profile</h1>

                <div className="mb-8 flex flex-col items-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-rose to-hot-pink text-3xl font-bold text-white shadow-lg">
                    {user.initials}
                  </div>
                  <button className="mt-3 text-sm font-semibold text-hot-pink opacity-50 cursor-not-allowed">
                    Change Photo (coming soon)
                  </button>
                </div>

                {profileMessage && (
                  <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{profileMessage}</div>
                )}
                {profileError && (
                  <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{profileError}</div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">First name</label>
                      <input
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Last name</label>
                      <input
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Phone</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">New password (optional)</label>
                    <input
                      type="password"
                      value={profileForm.newPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                      placeholder="Leave blank to keep current"
                      className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink"
                    />
                  </div>
                  {profileForm.newPassword && (
                    <div>
                      <label className="mb-1 block text-sm font-medium">Confirm new password</label>
                      <input
                        type="password"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                        className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink"
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    className="rounded-full bg-hot-pink px-8 py-3 text-sm font-semibold text-white hover:bg-deep-pink"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
