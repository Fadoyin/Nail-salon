"use client";

import { useState, useEffect } from "react";
import { api, type BlockedDate, type BusinessHour, type BlockedTimeSlot } from "@/lib/api";

export function AdminAvailability({ token }: { token: string }) {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedTimeSlot[]>([]);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [leadTimeHours, setLeadTimeHours] = useState(24);
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [slotStart, setSlotStart] = useState("12:00");
  const [slotEnd, setSlotEnd] = useState("13:00");
  const [msg, setMsg] = useState("");

  const load = async () => {
    const [h, d, s, settings] = await Promise.all([
      api.adminGetHours(token),
      api.adminGetBlockedDates(token),
      api.adminGetBlockedSlots(token),
      api.adminGetAvailabilitySettings(token),
    ]);
    setHours(h.hours);
    setBlockedDates(d.blockedDates);
    setBlockedSlots(s.blockedSlots);
    setBufferMinutes(settings.bufferMinutes);
    setLeadTimeHours(settings.leadTimeHours);
  };

  useEffect(() => { load(); }, [token]);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold text-deep-pink">Availability Manager</h1>
      {msg && <p className="text-sm text-green-600">{msg}</p>}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-blush bg-white p-6">
          <h2 className="font-semibold text-deep-pink">Working Hours</h2>
          <div className="mt-4 space-y-3">
            {hours.map((h, i) => (
              <div key={h.dayOfWeek} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-24 font-medium">{h.dayName}</span>
                <label className="flex items-center gap-1"><input type="checkbox" checked={h.isClosed} onChange={(e) => { const u = [...hours]; u[i] = { ...h, isClosed: e.target.checked }; setHours(u); }} />Closed</label>
                {!h.isClosed && (
                  <>
                    <input type="time" value={h.openTime} onChange={(e) => { const u = [...hours]; u[i] = { ...h, openTime: e.target.value }; setHours(u); }} className="rounded border border-blush px-2 py-1" />
                    <span>–</span>
                    <input type="time" value={h.closeTime} onChange={(e) => { const u = [...hours]; u[i] = { ...h, closeTime: e.target.value }; setHours(u); }} className="rounded border border-blush px-2 py-1" />
                  </>
                )}
              </div>
            ))}
          </div>
          <button onClick={async () => { await api.adminUpdateHours(token, hours); setMsg("Hours saved"); }} className="mt-4 rounded-full bg-hot-pink px-6 py-2 text-sm text-white">Save Hours</button>
        </div>

        <div className="rounded-2xl border border-blush bg-white p-6">
          <h2 className="font-semibold text-deep-pink">Buffer & Lead Time</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">Buffer between appointments (minutes)
              <input type="number" value={bufferMinutes} onChange={(e) => setBufferMinutes(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-blush px-3 py-2" />
            </label>
            <label className="block text-sm">Minimum booking notice (hours)
              <input type="number" value={leadTimeHours} onChange={(e) => setLeadTimeHours(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-blush px-3 py-2" />
            </label>
          </div>
          <button onClick={async () => { await api.adminUpdateAvailabilitySettings(token, bufferMinutes, leadTimeHours); setMsg("Settings saved"); }} className="mt-4 rounded-full bg-hot-pink px-6 py-2 text-sm text-white">Save Settings</button>
        </div>

        <div className="rounded-2xl border border-blush bg-white p-6">
          <h2 className="font-semibold text-deep-pink">Block Full Day</h2>
          <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} className="mt-3 w-full rounded-xl border border-blush px-3 py-2 text-sm" />
          <input placeholder="Reason (internal)" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} className="mt-2 w-full rounded-xl border border-blush px-3 py-2 text-sm" />
          <button onClick={async () => { await api.adminBlockDate(token, blockDate, blockReason); setBlockDate(""); load(); setMsg("Day blocked"); }} className="mt-3 rounded-full bg-hot-pink px-6 py-2 text-sm text-white">Block Date</button>
          <ul className="mt-4 space-y-1 text-sm">
            {blockedDates.map((d) => (
              <li key={d.id} className="flex justify-between rounded-lg bg-blush/30 px-3 py-2">
                <span>{d.date}{d.reason && ` — ${d.reason}`}</span>
                <button onClick={async () => { await api.adminUnblockDate(token, d.id); load(); }} className="text-red-500 text-xs">Remove</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-blush bg-white p-6">
          <h2 className="font-semibold text-deep-pink">Block Time Slot</h2>
          <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className="mt-3 w-full rounded-xl border border-blush px-3 py-2 text-sm" />
          <div className="mt-2 flex gap-2">
            <input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="flex-1 rounded-xl border border-blush px-3 py-2 text-sm" />
            <input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="flex-1 rounded-xl border border-blush px-3 py-2 text-sm" />
          </div>
          <button onClick={async () => { await api.adminBlockTimeSlot(token, slotDate, slotStart, slotEnd); load(); setMsg("Slot blocked"); }} className="mt-3 rounded-full bg-hot-pink px-6 py-2 text-sm text-white">Block Slot</button>
          <ul className="mt-4 space-y-1 text-sm">
            {blockedSlots.map((s) => (
              <li key={s.id} className="flex justify-between rounded-lg bg-blush/30 px-3 py-2">
                <span>{s.date} {s.startTime}–{s.endTime}</span>
                <button onClick={async () => { await api.adminUnblockTimeSlot(token, s.id); load(); }} className="text-red-500 text-xs">Remove</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
