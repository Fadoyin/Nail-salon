"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  parseISO,
  isBefore,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { BookingCard } from "@/types";

interface BookingActionsProps {
  booking: BookingCard;
  token: string;
  onUpdated: () => void;
}

export function BookingActions({ booking, token, onUpdated }: BookingActionsProps) {
  const [showCancel, setShowCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [policy, setPolicy] = useState<{
    canCancel: boolean;
    canReschedule: boolean;
    refundEligible: boolean;
    hoursUntil: number;
    cancellationHours: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<{ time: string; displayTime: string }[]>([]);
  const [selectedTime, setSelectedTime] = useState("");

  const openCancel = async () => {
    setError("");
    setMessage("");
    try {
      const p = await api.getBookingPolicy(booking.reference, token);
      setPolicy(p);
      setShowCancel(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load policy");
    }
  };

  const openReschedule = async () => {
    setError("");
    setMessage("");
    try {
      const p = await api.getBookingPolicy(booking.reference, token);
      if (!p.canReschedule) {
        setError(`Rescheduling requires at least ${p.cancellationHours} hours notice`);
        return;
      }
      setPolicy(p);
      setShowReschedule(true);
      const month = format(new Date(), "yyyy-MM");
      const cal = await api.getCalendar(month, booking.durationMin);
      setAvailableDates(cal.availableDates);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to open reschedule");
    }
  };

  const loadCalendar = async (month: Date) => {
    const data = await api.getCalendar(format(month, "yyyy-MM"), booking.durationMin);
    setAvailableDates(data.availableDates);
  };

  const loadSlots = async (date: string) => {
    const data = await api.getSlots(date, booking.durationMin);
    setSlots(data.slots);
  };

  const handleCancel = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.cancelBooking(booking.reference, token);
      setMessage(result.refund.message);
      setShowCancel(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cancellation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.rescheduleBooking(booking.reference, selectedDate, selectedTime, token);
      setMessage(result.message);
      setShowReschedule(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reschedule failed");
    } finally {
      setLoading(false);
    }
  };

  if (booking.displayStatus !== "upcoming") return null;

  const calendarDays = eachDayOfInterval({
    start: startOfMonth(calendarMonth),
    end: endOfMonth(calendarMonth),
  });

  return (
    <div className="mt-4 border-t border-blush pt-4">
      {message && <p className="mb-2 text-sm text-green-600">{message}</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={openCancel}
          className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          Cancel
        </button>
        <button
          onClick={openReschedule}
          className="rounded-full border border-hot-pink px-4 py-1.5 text-xs font-semibold text-hot-pink hover:bg-blush"
        >
          Reschedule
        </button>
      </div>

      {showCancel && policy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCancel(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-deep-pink">Cancel Appointment</h3>
            <p className="mt-2 text-sm text-foreground/60">
              {policy.refundEligible
                ? "Your deposit will be refunded (48+ hours notice)."
                : `Within ${policy.cancellationHours} hours — deposit is non-refundable.`}
            </p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowCancel(false)} className="flex-1 rounded-full border py-2 text-sm">Keep</button>
              <button onClick={handleCancel} disabled={loading} className="flex-1 rounded-full bg-red-500 py-2 text-sm text-white disabled:opacity-60">
                {loading ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowReschedule(false)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-deep-pink">Reschedule</h3>

            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => { const m = subMonths(calendarMonth, 1); setCalendarMonth(m); loadCalendar(m); }} className="p-1 text-hot-pink"><ChevronLeft size={18} /></button>
              <span className="text-sm font-semibold">{format(calendarMonth, "MMMM yyyy")}</span>
              <button onClick={() => { const m = addMonths(calendarMonth, 1); setCalendarMonth(m); loadCalendar(m); }} className="p-1 text-hot-pink"><ChevronRight size={18} /></button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1">
              {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => <div key={i} />)}
              {calendarDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const ok = availableDates.includes(dateStr) && !isBefore(day, startOfDay(new Date()));
                return (
                  <button
                    key={dateStr}
                    disabled={!ok}
                    onClick={() => { setSelectedDate(dateStr); setSelectedTime(""); loadSlots(dateStr); }}
                    className={`aspect-square rounded text-xs ${selectedDate === dateStr ? "bg-hot-pink text-white" : ok ? "bg-blush text-deep-pink" : "text-foreground/20"}`}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {slots.map((s) => (
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
              <button onClick={() => setShowReschedule(false)} className="flex-1 rounded-full border py-2 text-sm">Cancel</button>
              <button onClick={handleReschedule} disabled={!selectedDate || !selectedTime || loading} className="flex-1 rounded-full bg-hot-pink py-2 text-sm text-white disabled:opacity-40">
                {loading ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
