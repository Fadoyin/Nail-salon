"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  parseISO,
  isBefore,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Check, Lock } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Service, TimeSlot } from "@/types";

const CATEGORIES = [
  { id: "NAILS", label: "Nails" },
  { id: "TOE_NAILS", label: "Toe Nails" },
  { id: "LASHES", label: "Lashes" },
  { id: "EYEBROWS", label: "Eyebrows" },
  { id: "PEDICURE", label: "Pedicure" },
  { id: "MANICURE", label: "Manicure" },
];

const STEPS = ["Service", "Date", "Time", "Details", "Payment", "Done"];

function BookContent() {
  const searchParams = useSearchParams();
  const { user, token } = useAuth();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [services, setServices] = useState<Service[]>([]);
  const [addOns, setAddOns] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [policy, setPolicy] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingResult, setBookingResult] = useState<{
    booking: { reference: string; appointmentDate: string; appointmentTime: string; totalFormatted: string; depositFormatted: string; remainingFormatted: string; services: { name: string }[] };
    payment: { clientSecret: string | null; depositFormatted: string; totalFormatted: string; remainingFormatted: string };
  } | null>(null);

  const durationMin = selectedService
    ? selectedService.durationMin +
      addOns.filter((a) => selectedAddOns.includes(a.id)).reduce((s, a) => s + a.durationMin, 0)
    : 60;

  const totalPence = selectedService
    ? selectedService.pricePence +
      addOns.filter((a) => selectedAddOns.includes(a.id)).reduce((s, a) => s + a.pricePence, 0)
    : 0;

  const formatPence = (p: number) => `£${(p / 100).toFixed(2)}`;
  const depositPence = Math.round(totalPence * 0.5);
  const remainingPence = totalPence - depositPence;

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      setPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    api.getPolicy().then((p) => setPolicy(p.policy)).catch(() => {});
  }, []);

  useEffect(() => {
    const serviceId = searchParams.get("service");
    const cat = searchParams.get("category");
    if (cat) setCategory(cat);
    if (serviceId && cat) {
      api.getServices(cat).then((data) => {
        const list = Array.isArray(data.services) ? data.services : [];
        const found = (list as Service[]).find((s) => "id" in s && s.id === serviceId);
        if (found) {
          setSelectedService(found);
          setCategory(cat);
        }
      }).catch(() => {});
    }
  }, [searchParams]);

  useEffect(() => {
    if (!category) return;
    api.getServices(category).then((data) => {
      const list = data.services ?? [];
      setServices(Array.isArray(list) && list.length && "pricePence" in list[0] ? list as Service[] : []);
    }).catch(() => setServices([]));
    api.getAddOns().then((data) => setAddOns(data.addOns)).catch(() => {});
  }, [category]);

  useEffect(() => {
    if (step !== 1 || !selectedService) return;
    const month = format(calendarMonth, "yyyy-MM");
    api.getCalendar(month, durationMin)
      .then((data) => setAvailableDates(data.availableDates))
      .catch(() => setAvailableDates([]));
  }, [step, calendarMonth, durationMin, selectedService]);

  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    api.getSlots(selectedDate, durationMin)
      .then((data) => setSlots(data.slots))
      .catch(() => setSlots([]));
  }, [selectedDate, durationMin, selectedService]);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmitBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.createBooking(
        {
          serviceId: selectedService.id,
          addOnIds: selectedAddOns,
          date: selectedDate,
          time: selectedTime,
          firstName,
          lastName,
          email,
          phone,
          notes: notes || undefined,
          policyAccepted: true,
        },
        token
      );
      setBookingResult(result);

      if (!result.payment?.clientSecret) {
        setStep(5);
      } else {
        setStep(4);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfMonth(calendarMonth),
    end: endOfMonth(calendarMonth),
  });

  if (step === 5 && bookingResult) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blush text-4xl">
          🌸
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold text-deep-pink">
          You&apos;re booked & paid!
        </h1>
        <div className="mt-8 rounded-2xl border border-blush bg-white p-6 text-left">
          <p className="text-sm text-foreground/50">Reference</p>
          <p className="font-bold text-deep-pink">{bookingResult.booking.reference}</p>
          <div className="mt-4 space-y-2 text-sm">
            <p><strong>Service:</strong> {bookingResult.booking.services.map((s) => s.name).join(", ")}</p>
            <p><strong>Date:</strong> {bookingResult.booking.appointmentDate}</p>
            <p><strong>Time:</strong> {bookingResult.booking.appointmentTime}</p>
            <p><strong>Total:</strong> {bookingResult.booking.totalFormatted}</p>
            <p><strong>Deposit paid:</strong> {bookingResult.booking.depositFormatted}</p>
            <p><strong>Remaining on the day:</strong> {bookingResult.booking.remainingFormatted}</p>
          </div>
        </div>
        <a
          href="https://www.trustpilot.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block text-sm font-semibold text-hot-pink hover:underline"
        >
          ⭐ Leave us a review on Trustpilot
        </a>
        {user && (
          <Link
            href="/dashboard"
            className="mt-4 block text-sm text-foreground/60 hover:text-hot-pink"
          >
            View in My Dashboard →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-deep-pink text-center">
        Book an Appointment
      </h1>

      {/* Step indicator */}
      <div className="mt-8 flex justify-between">
        {STEPS.slice(0, 5).map((label, i) => (
          <div key={label} className="flex flex-col items-center flex-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                i < step
                  ? "bg-hot-pink text-white"
                  : i === step
                  ? "bg-rose text-white ring-4 ring-blush"
                  : "bg-blush text-foreground/40"
              }`}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className="mt-1 hidden text-xs text-foreground/50 sm:block">{label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Step 0: Service */}
      {step === 0 && (
        <div className="mt-8 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold">Category</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.id); setSelectedService(null); }}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                    category === cat.id
                      ? "bg-hot-pink text-white"
                      : "border border-blush hover:bg-blush"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {category && (
            <div>
              <label className="mb-2 block text-sm font-semibold">Service</label>
              <div className="space-y-2">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition ${
                      selectedService?.id === s.id
                        ? "border-2 border-hot-pink bg-blush/50"
                        : "border border-blush hover:bg-blush/30"
                    }`}
                  >
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-sm font-bold text-deep-pink">{s.priceFormatted}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedService && addOns.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-semibold">Add-ons (optional)</label>
              <div className="space-y-2">
                {addOns.map((a) => (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-blush px-4 py-3 hover:bg-blush/30"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedAddOns.includes(a.id)}
                        onChange={() => toggleAddOn(a.id)}
                        className="accent-hot-pink"
                      />
                      <span className="text-sm">{a.name}</span>
                    </div>
                    <span className="text-sm font-bold text-deep-pink">{a.priceFormatted}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedService && (
            <div className="rounded-xl bg-blush/50 px-4 py-3 text-center">
              <span className="text-sm text-foreground/60">Total: </span>
              <span className="text-lg font-bold text-deep-pink">{formatPence(totalPence)}</span>
              <span className="text-sm text-foreground/60"> — Deposit today: </span>
              <span className="font-bold text-hot-pink">{formatPence(depositPence)}</span>
            </div>
          )}

          <button
            disabled={!selectedService}
            onClick={() => setStep(1)}
            className="w-full rounded-full bg-hot-pink py-3 font-semibold text-white transition hover:bg-deep-pink disabled:opacity-40"
          >
            Continue to Date
          </button>
        </div>
      )}

      {/* Step 1: Date */}
      {step === 1 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-2 text-hot-pink">
              <ChevronLeft size={20} />
            </button>
            <h3 className="font-display text-lg font-semibold text-deep-pink">
              {format(calendarMonth, "MMMM yyyy")}
            </h3>
            <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-2 text-hot-pink">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-foreground/50 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {calendarDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isAvailable = availableDates.includes(dateStr);
              const isPast = isBefore(day, startOfDay(new Date()));
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={dateStr}
                  disabled={!isAvailable || isPast}
                  onClick={() => { setSelectedDate(dateStr); setSelectedTime(""); }}
                  className={`aspect-square rounded-lg text-sm font-medium transition ${
                    isSelected
                      ? "bg-hot-pink text-white"
                      : isAvailable && !isPast
                      ? "bg-blush text-deep-pink hover:bg-rose hover:text-white"
                      : "text-foreground/20 cursor-not-allowed"
                  }`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 rounded-full border border-blush py-3 text-sm font-semibold">
              Back
            </button>
            <button
              disabled={!selectedDate}
              onClick={() => setStep(2)}
              className="flex-1 rounded-full bg-hot-pink py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Time */}
      {step === 2 && (
        <div className="mt-8">
          <p className="text-sm text-foreground/60 mb-4">
            Available times for {selectedDate && format(parseISO(selectedDate), "EEEE, d MMMM")}
          </p>
          {slots.length === 0 ? (
            <p className="text-center text-foreground/50 py-8">No slots available</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => setSelectedTime(slot.time)}
                  className={`rounded-xl py-3 text-sm font-semibold transition ${
                    selectedTime === slot.time
                      ? "bg-hot-pink text-white shadow-md"
                      : "border border-blush bg-blush/30 text-deep-pink hover:bg-blush"
                  }`}
                >
                  {slot.displayTime}
                </button>
              ))}
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 rounded-full border border-blush py-3 text-sm font-semibold">
              Back
            </button>
            <button
              disabled={!selectedTime}
              onClick={() => setStep(3)}
              className="flex-1 rounded-full bg-hot-pink py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required
                className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required
                className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required
              className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink resize-none" />
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 rounded-full border border-blush py-3 text-sm font-semibold">
              Back
            </button>
            <button
              disabled={!firstName || !lastName || !email || !phone}
              onClick={() => setStep(4)}
              className="flex-1 rounded-full bg-hot-pink py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Payment */}
      {step === 4 && (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-blush bg-white p-6">
            <h3 className="font-display text-lg font-semibold text-deep-pink">Order Summary</h3>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{selectedService?.name}</span>
                <span className="font-semibold">{selectedService?.priceFormatted}</span>
              </div>
              {selectedAddOns.map((id) => {
                const addon = addOns.find((a) => a.id === id);
                return addon ? (
                  <div key={id} className="flex justify-between text-foreground/60">
                    <span>+ {addon.name}</span>
                    <span>{addon.priceFormatted}</span>
                  </div>
                ) : null;
              })}
              <div className="border-t border-blush pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-deep-pink">{formatPence(totalPence)}</span>
              </div>
              <div className="flex justify-between text-hot-pink">
                <span>Deposit due today (50%)</span>
                <span className="font-bold">{formatPence(depositPence)}</span>
              </div>
              <div className="flex justify-between text-foreground/60">
                <span>Remaining on the day</span>
                <span>{formatPence(remainingPence)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blush bg-blush/20 p-4">
            <h4 className="text-sm font-semibold text-deep-pink">Cancellation Policy</h4>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-foreground/60 leading-relaxed font-sans">
              {policy}
            </pre>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={policyAccepted}
              onChange={(e) => setPolicyAccepted(e.target.checked)}
              className="mt-1 accent-hot-pink"
            />
            <span className="text-sm text-foreground/70">
              I have read and agree to the cancellation policy
            </span>
          </label>

          <div className="rounded-xl border border-dashed border-rose bg-blush/30 p-6 text-center">
            <Lock className="mx-auto text-hot-pink" size={24} />
            <p className="mt-2 text-sm text-foreground/60">
              {bookingResult?.payment?.clientSecret
                ? "Stripe payment form would appear here once your publishable key is configured."
                : "Secure payment via Stripe (card, Apple Pay, Google Pay). Demo mode active until Stripe keys are added."}
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="flex-1 rounded-full border border-blush py-3 text-sm font-semibold">
              Back
            </button>
            <button
              disabled={!policyAccepted || loading}
              onClick={handleSubmitBooking}
              className="flex-1 rounded-full bg-hot-pink py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? "Processing..." : `Pay Deposit ${formatPence(depositPence)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center">Loading...</div>}>
      <BookContent />
    </Suspense>
  );
}
