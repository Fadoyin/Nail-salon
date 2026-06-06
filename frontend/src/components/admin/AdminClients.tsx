"use client";

import { useState, useEffect } from "react";
import { api, type AdminClient, type AdminClientDetail } from "@/lib/api";

export function AdminClients({ token }: { token: string }) {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [selected, setSelected] = useState<AdminClientDetail | null>(null);
  const [notes, setNotes] = useState("");

  const load = () => api.adminGetClients(token, search, sortBy).then((d) => setClients(d.clients));

  useEffect(() => { load(); }, [token, search, sortBy]);

  const openClient = async (id: string) => {
    const { client } = await api.adminGetClient(token, id);
    setSelected(client);
    setNotes(client.internalNotes ?? "");
  };

  const saveNotes = async () => {
    if (!selected) return;
    await api.adminUpdateClientNotes(token, selected.id, notes);
    setSelected({ ...selected, internalNotes: notes });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-deep-pink">Clients</h1>
      <div className="flex gap-3">
        <input placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl border border-blush px-4 py-2 text-sm" />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-xl border border-blush px-4 py-2 text-sm">
          <option value="">Sort: Recent</option>
          <option value="spent">Most spent</option>
          <option value="bookings">Most bookings</option>
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((c) => (
          <button key={c.id} onClick={() => openClient(c.id)} className="rounded-2xl border border-blush bg-white p-4 text-left hover:border-rose">
            <p className="font-semibold text-deep-pink">{c.fullName}</p>
            <p className="text-xs text-foreground/50">{c.email}</p>
            <div className="mt-2 flex gap-4 text-xs text-foreground/60">
              <span>{c.bookingCount} bookings</span>
              <span>{c.totalSpentFormatted} spent</span>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-deep-pink">{selected.fullName}</h3>
            <p className="text-sm text-foreground/60">{selected.email} · {selected.phone}</p>
            <p className="mt-2 text-sm">Joined {new Date(selected.createdAt).toLocaleDateString()} · {selected.totalSpentFormatted} total</p>
            <h4 className="mt-4 text-sm font-semibold">Booking History</h4>
            <ul className="mt-2 space-y-2 text-sm">
              {selected.bookings.map((b) => (
                <li key={b.reference} className="rounded-lg bg-blush/30 px-3 py-2">{b.service} — {b.date} {b.time} ({b.status})</li>
              ))}
            </ul>
            <h4 className="mt-4 text-sm font-semibold">Internal Notes</h4>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-blush p-3 text-sm" />
            <button onClick={saveNotes} className="mt-3 rounded-full bg-hot-pink px-6 py-2 text-sm text-white">Save Notes</button>
          </div>
        </div>
      )}
    </div>
  );
}
