"use client";

import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isBefore,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, ApiError, type AdminBooking } from "@/lib/api";

export function AdminRescheduleModal({
  booking,
  token,
  onClose,
  onDone,
}: {
  booking: AdminBooking;
  token: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const durationMin = booking.durationMin ?? 60;
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<{ time: string; displayTime: string }[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadCalendar = async (month: Date) => {
    const data = await api.getCalendar(format(month, "yyyy-MM"), durationMin);
    setAvailableDates(data.availableDates);
  };

  useEffect(() => {
    loadCalendar(calendarMonth);
  }, []);

  const loadSlots = async (date: string) => {
    const data = await api.getSlots(date, durationMin);
    setSlots(data.slots);
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) return;
    setLoading(true);
    setError("");
    try {
      await api.adminRescheduleAppointment(token, booking.reference, selectedDate, selectedTime);
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reschedule failed");
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfMonth(calendarMonth),
    end: endOfMonth(calendarMonth),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold text-deep-pink">Reschedule — {booking.reference}</h3>
        <p className="mt-1 text-sm text-foreground/50">{booking.clientName} · {booking.serviceName}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => { const m = subMonths(calendarMonth, 1); setCalendarMonth(m); loadCalendar(m); }} className="p-1 text-hot-pink"><ChevronLeft size={18} /></button>
          <span className="text-sm font-semibold">{format(calendarMonth, "MMMM yyyy")}</span>
          <button onClick={() => { const m = addMonths(calendarMonth, 1); setCalendarMonth(m); loadCalendar(m); }} className="p-1 text-hot-pink"><ChevronRight size={18} /></button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-foreground/40">
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
          {calendarDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const ok = availableDates.includes(dateStr) && !isBefore(day, startOfDay(new Date()));
            return (
              <button
                key={dateStr}
                disabled={!ok}
                onClick={() => { setSelectedDate(dateStr); setSelectedTime(""); loadSlots(dateStr); }}
                className={`aspect-square rounded text-xs ${selectedDate === dateStr ? "bg-hot-pink text-white" : ok ? "bg-blush text-deep-pink hover:bg-rose" : "text-foreground/20"}`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {slots.length === 0 ? (
              <p className="col-span-3 text-sm text-foreground/50">No slots available</p>
            ) : slots.map((s) => (
              <button
                key={s.time}
                onClick={() => setSelectedTime(s.time)}
                className={`rounded-lg py-2 text-xs font-semibold ${selectedTime === s.time ? "bg-hot-pink text-white" : "bg-blush text-deep-pink"}`}
              >
                {s.displayTime}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full border py-2 text-sm">Cancel</button>
          <button onClick={handleReschedule} disabled={!selectedDate || !selectedTime || loading} className="flex-1 rounded-full bg-hot-pink py-2 text-sm text-white disabled:opacity-40">
            {loading ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
