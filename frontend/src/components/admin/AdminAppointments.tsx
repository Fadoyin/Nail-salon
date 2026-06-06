"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, type AdminBooking } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { AdminRescheduleModal } from "./AdminRescheduleModal";

type ViewMode = "list" | "calendar";

export function AdminAppointments({ token, onRefresh }: { token: string; onRefresh: () => void }) {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [notesBooking, setNotesBooking] = useState<AdminBooking | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<AdminBooking | null>(null);
  const [notes, setNotes] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [manual, setManual] = useState({
    serviceId: "", date: "", time: "10:00", firstName: "", lastName: "", email: "", phone: "", depositPaid: true,
  });

  const monthRange = useMemo(() => ({
    dateFrom: format(startOfMonth(calendarMonth), "yyyy-MM-dd"),
    dateTo: format(endOfMonth(calendarMonth), "yyyy-MM-dd"),
  }), [calendarMonth]);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    if (viewMode === "calendar") {
      params.dateFrom = monthRange.dateFrom;
      params.dateTo = monthRange.dateTo;
    }
    const data = await api.adminGetAppointments(token, params);
    setBookings(data.bookings);
    setLoading(false);
  }, [token, statusFilter, search, viewMode, monthRange]);

  useEffect(() => {
    load();
    api.adminGetServices().then((d) => {
      setServices(d.services.flatMap((g) => g.services));
    });
  }, [load]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, AdminBooking[]> = {};
    for (const b of bookings) {
      (map[b.appointmentDate] ??= []).push(b);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
    }
    return map;
  }, [bookings]);

  const calendarDays = eachDayOfInterval({
    start: startOfMonth(calendarMonth),
    end: endOfMonth(calendarMonth),
  });

  const dayBookings = selectedDay ? bookingsByDate[selectedDay] ?? [] : [];

  const handleAction = async (ref: string, action: string) => {
    if (action === "complete") await api.adminCompleteBooking(token, ref);
    if (action === "confirm") await api.adminUpdateAppointmentStatus(token, ref, "CONFIRMED");
    if (action === "cancel") await api.adminCancelAppointment(token, ref);
    load();
    onRefresh();
  };

  const saveNotes = async () => {
    if (!notesBooking) return;
    await api.adminUpdateAppointmentNotes(token, notesBooking.reference, notes);
    setNotesBooking(null);
    load();
  };

  const submitManual = async () => {
    await api.adminManualBooking(token, manual);
    setShowManual(false);
    load();
    onRefresh();
  };

  const BookingRow = ({ b }: { b: AdminBooking }) => (
    <tr className="border-b border-blush/50">
      <td className="px-3 py-2 font-mono text-xs">{b.reference}</td>
      <td className="px-3 py-2">{b.clientName}<br /><span className="text-xs text-foreground/40">{b.phone}</span></td>
      <td className="px-3 py-2">{b.serviceName}</td>
      <td className="px-3 py-2">{b.appointmentDate} {b.appointmentTime}</td>
      <td className="px-3 py-2">{b.depositFormatted}</td>
      <td className="px-3 py-2"><StatusBadge status={b.status.toLowerCase()} /></td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setNotesBooking(b); setNotes(b.internalNotes ?? ""); }} className="text-xs text-hot-pink">Notes</button>
          {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
            <button onClick={() => setRescheduleBooking(b)} className="text-xs text-deep-pink">Reschedule</button>
          )}
          {b.status === "CONFIRMED" && <button onClick={() => handleAction(b.reference, "complete")} className="text-xs text-green-600">Done</button>}
          {b.status === "PENDING_PAYMENT" && <button onClick={() => handleAction(b.reference, "confirm")} className="text-xs text-hot-pink">Confirm</button>}
          {b.status !== "CANCELLED" && b.status !== "COMPLETED" && <button onClick={() => handleAction(b.reference, "cancel")} className="text-xs text-red-500">Cancel</button>}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-deep-pink">Appointments</h1>
        <div className="flex gap-2">
          <div className="flex rounded-full border border-blush p-0.5">
            <button onClick={() => setViewMode("list")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${viewMode === "list" ? "bg-hot-pink text-white" : "text-foreground/60"}`}>List</button>
            <button onClick={() => setViewMode("calendar")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${viewMode === "calendar" ? "bg-hot-pink text-white" : "text-foreground/60"}`}>Calendar</button>
          </div>
          <button onClick={() => setShowManual(true)} className="rounded-full bg-hot-pink px-4 py-2 text-sm font-semibold text-white">+ Manual Booking</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl border border-blush px-4 py-2 text-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-blush px-4 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING_PAYMENT">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button onClick={load} className="rounded-full border border-blush px-4 py-2 text-sm">Apply</button>
      </div>

      {loading ? <p className="text-foreground/50">Loading...</p> : viewMode === "list" ? (
        <div className="overflow-x-auto rounded-2xl border border-blush bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blush bg-blush/30 text-left">
                <th className="px-3 py-2">Ref</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">When</th><th className="px-3 py-2">Deposit</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => <BookingRow key={b.id} b={b} />)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blush bg-white p-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-2 text-hot-pink"><ChevronLeft size={20} /></button>
              <h2 className="font-display text-lg font-semibold text-deep-pink">{format(calendarMonth, "MMMM yyyy")}</h2>
              <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-2 text-hot-pink"><ChevronRight size={20} /></button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-foreground/40">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
              {calendarDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const count = bookingsByDate[dateStr]?.length ?? 0;
                const isSelected = selectedDay === dateStr;
                const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(dateStr)}
                    className={`min-h-[72px] rounded-xl border p-1 text-left transition ${
                      isSelected ? "border-hot-pink bg-blush" : isToday ? "border-deep-pink/40 bg-white" : "border-blush/50 bg-white hover:border-rose"
                    }`}
                  >
                    <span className={`text-xs font-semibold ${isToday ? "text-hot-pink" : "text-foreground/70"}`}>{format(day, "d")}</span>
                    {count > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {bookingsByDate[dateStr].slice(0, 2).map((b) => (
                          <p key={b.id} className="truncate rounded bg-hot-pink/10 px-1 text-[10px] text-deep-pink">{b.appointmentTime} {b.clientName.split(" ")[0]}</p>
                        ))}
                        {count > 2 && <p className="text-[10px] text-foreground/40">+{count - 2} more</p>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDay && (
            <div className="rounded-2xl border border-blush bg-white p-4">
              <h3 className="font-semibold text-deep-pink">
                {format(parseISO(selectedDay), "EEEE, d MMMM yyyy")}
                <span className="ml-2 text-sm font-normal text-foreground/50">({dayBookings.length} appointments)</span>
              </h3>
              {dayBookings.length === 0 ? (
                <p className="mt-2 text-sm text-foreground/50">No appointments this day</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-blush bg-blush/30 text-left">
                        <th className="px-3 py-2">Time</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">Service</th>
                        <th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayBookings.map((b) => (
                        <tr key={b.id} className="border-b border-blush/50">
                          <td className="px-3 py-2">{b.appointmentTime}</td>
                          <td className="px-3 py-2">{b.clientName}</td>
                          <td className="px-3 py-2">{b.serviceName}</td>
                          <td className="px-3 py-2"><StatusBadge status={b.status.toLowerCase()} /></td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => { setNotesBooking(b); setNotes(b.internalNotes ?? ""); }} className="text-xs text-hot-pink">Notes</button>
                              {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                                <button onClick={() => setRescheduleBooking(b)} className="text-xs text-deep-pink">Reschedule</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {notesBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setNotesBooking(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-deep-pink">Notes — {notesBooking.reference}</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-3 w-full rounded-xl border border-blush p-3 text-sm" />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setNotesBooking(null)} className="flex-1 rounded-full border py-2 text-sm">Close</button>
              <button onClick={saveNotes} className="flex-1 rounded-full bg-hot-pink py-2 text-sm text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {rescheduleBooking && (
        <AdminRescheduleModal
          booking={rescheduleBooking}
          token={token}
          onClose={() => setRescheduleBooking(null)}
          onDone={() => { load(); onRefresh(); }}
        />
      )}

      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowManual(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-deep-pink">Manual Booking</h3>
            <div className="mt-4 grid gap-3">
              <select value={manual.serviceId} onChange={(e) => setManual({ ...manual, serviceId: e.target.value })} className="rounded-xl border border-blush px-3 py-2 text-sm">
                <option value="">Service</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} className="rounded-xl border border-blush px-3 py-2 text-sm" />
                <input type="time" value={manual.time} onChange={(e) => setManual({ ...manual, time: e.target.value })} className="rounded-xl border border-blush px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="First" value={manual.firstName} onChange={(e) => setManual({ ...manual, firstName: e.target.value })} className="rounded-xl border border-blush px-3 py-2 text-sm" />
                <input placeholder="Last" value={manual.lastName} onChange={(e) => setManual({ ...manual, lastName: e.target.value })} className="rounded-xl border border-blush px-3 py-2 text-sm" />
              </div>
              <input placeholder="Email" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} className="rounded-xl border border-blush px-3 py-2 text-sm" />
              <input placeholder="Phone" value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} className="rounded-xl border border-blush px-3 py-2 text-sm" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={manual.depositPaid} onChange={(e) => setManual({ ...manual, depositPaid: e.target.checked })} />Deposit paid</label>
              <button onClick={submitManual} className="rounded-full bg-hot-pink py-3 text-sm font-semibold text-white">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
