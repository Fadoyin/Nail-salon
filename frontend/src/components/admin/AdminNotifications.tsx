"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { api, type AdminNotification } from "@/lib/api";

const icons: Record<string, string> = {
  NEW_BOOKING: "🆕", DEPOSIT_CONFIRMED: "💳", BOOKING_CANCELLED: "❌",
  BOOKING_RESCHEDULED: "🔄", NEW_CLIENT: "👤", LATE_CANCELLATION: "⚠️", REFUND_ISSUED: "💷",
};

export function AdminNotifications({ token, onRead }: { token: string; onRead: () => void }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  const load = () => api.adminGetNotifications(token).then((d) => setNotifications(d.notifications));

  useEffect(() => { load(); }, [token]);

  const markRead = async (id: string) => {
    await api.adminMarkNotificationRead(token, id);
    load();
    onRead();
  };

  const markAll = async () => {
    await api.adminMarkAllNotificationsRead(token);
    load();
    onRead();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-deep-pink">Notifications</h1>
        <button onClick={markAll} className="text-sm font-semibold text-hot-pink hover:underline">Mark all read</button>
      </div>
      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            className={`cursor-pointer rounded-2xl border bg-white p-4 ${n.read ? "border-blush" : "border-l-4 border-l-hot-pink border-blush"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{icons[n.type] ?? "🔔"} {n.title}</p>
                <p className="mt-1 text-sm text-foreground/60">{n.message}</p>
              </div>
              <span className="flex-shrink-0 text-xs text-foreground/40">
                {formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
        {notifications.length === 0 && <p className="text-foreground/50">No notifications yet</p>}
      </div>
    </div>
  );
}
