const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      data.error ?? "Something went wrong",
      res.status,
      data.code,
      data.details
    );
  }

  return data as T;
}

export const api = {
  getServices: (category?: string) =>
    request<{
      services: import("@/types").Service[] | { category: string; categoryLabel: string; services: import("@/types").Service[] }[];
      addOns?: import("@/types").Service[];
      categories?: import("@/types").ServiceCategory[];
    }>(category ? `/api/services?category=${category}` : "/api/services"),

  getCategories: () => request<{ categories: { id: string; label: string }[] }>("/api/services/categories"),

  getAddOns: () => request<{ addOns: import("@/types").Service[] }>("/api/services/add-ons"),

  getCalendar: (month: string, durationMin: number) =>
    request<{ month: string; availableDates: string[] }>(
      `/api/availability/calendar?month=${month}&durationMin=${durationMin}`
    ),

  getSlots: (date: string, durationMin: number) =>
    request<{ date: string; slots: import("@/types").TimeSlot[] }>(
      `/api/availability/slots?date=${date}&durationMin=${durationMin}`
    ),

  getPolicy: () =>
    request<{ policy: string; depositPercentage: number; cancellationHours: number }>(
      "/api/bookings/policy"
    ),

  createBooking: (
    body: Record<string, unknown>,
    token?: string | null
  ) =>
    request<{
      booking: {
        reference: string;
        appointmentDate: string;
        appointmentTime: string;
        totalFormatted: string;
        depositFormatted: string;
        remainingFormatted: string;
        services: { name: string }[];
      };
      payment: {
        clientSecret: string | null;
        depositFormatted: string;
        totalFormatted: string;
        remainingFormatted: string;
      };
    }>("/api/bookings", { method: "POST", body: JSON.stringify(body) }, token),

  confirmPayment: (paymentIntentId: string) =>
    request("/api/bookings/confirm-payment", {
      method: "POST",
      body: JSON.stringify({ paymentIntentId }),
    }),

  register: (body: Record<string, unknown>) =>
    request<{ user: import("@/types").User; token: string; message: string }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify(body) }
    ),

  login: (body: Record<string, unknown>) =>
    request<{ user: import("@/types").User; token: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(body) }
    ),

  getMe: (token: string) =>
    request<{ user: import("@/types").User }>("/api/auth/me", {}, token),

  updateProfile: (body: Record<string, unknown>, token: string) =>
    request<{ user: import("@/types").User; message: string }>(
      "/api/auth/profile",
      { method: "PATCH", body: JSON.stringify(body) },
      token
    ),

  getDashboardOverview: (token: string) =>
    request<import("@/types").DashboardOverview>("/api/dashboard/overview", {}, token),

  getAppointments: (token: string) =>
    request<{ upcoming: import("@/types").BookingCard[]; past: import("@/types").BookingCard[] }>(
      "/api/dashboard/appointments",
      {},
      token
    ),

  getHistory: (token: string) =>
    request<{
      bookings: {
        id: string;
        reference: string;
        service: string;
        date: string;
        time: string;
        totalFormatted: string;
        displayStatus: string;
      }[];
    }>("/api/dashboard/history", {}, token),

  getNotifications: (token: string) =>
    request<{ unreadCount: number; notifications: import("@/types").Notification[] }>(
      "/api/dashboard/notifications",
      {},
      token
    ),

  markNotificationRead: (id: string, token: string) =>
    request(`/api/dashboard/notifications/${id}/read`, { method: "PATCH" }, token),

  markAllNotificationsRead: (token: string) =>
    request("/api/dashboard/notifications/read-all", { method: "PATCH" }, token),

  cancelBooking: (reference: string, token: string, reason?: string) =>
    request<{
      booking: unknown;
      refund: { eligible: boolean; amountFormatted: string; message: string; hoursUntil: number };
    }>(`/api/dashboard/bookings/${reference}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }, token),

  rescheduleBooking: (reference: string, date: string, time: string, token: string) =>
    request<{ booking: unknown; message: string }>(
      `/api/dashboard/bookings/${reference}/reschedule`,
      { method: "POST", body: JSON.stringify({ date, time }) },
      token
    ),

  getBookingPolicy: (reference: string, token: string) =>
    request<{
      hoursUntil: number;
      canCancel: boolean;
      canReschedule: boolean;
      refundEligible: boolean;
      cancellationHours: number;
    }>(`/api/dashboard/bookings/${reference}/policy`, {}, token),

  forgotPassword: (email: string) =>
    request<{ message: string; devResetUrl?: string | null }>(
      "/api/auth/forgot-password",
      { method: "POST", body: JSON.stringify({ email }) }
    ),

  resetPassword: (token: string, password: string, confirmPassword: string) =>
    request<{ message: string }>(
      "/api/auth/reset-password",
      { method: "POST", body: JSON.stringify({ token, password, confirmPassword }) }
    ),

  adminLogin: (email: string, password: string) =>
    request<{ admin: { id: string; email: string; name: string }; token: string }>(
      "/api/admin/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  adminGetStats: (token: string) => request("/api/admin/stats", {}, token),

  adminGetBookings: (token: string, status?: string) =>
    request<{ bookings: AdminBooking[] }>(
      `/api/admin/bookings${status ? `?status=${status}` : ""}`,
      {},
      token
    ),

  adminBlockDate: (token: string, date: string, reason?: string) =>
    request("/api/admin/availability/blocked", {
      method: "POST",
      body: JSON.stringify({ date, reason }),
    }, token),

  adminUnblockDate: (token: string, id: string) =>
    request(`/api/admin/availability/blocked/${id}`, { method: "DELETE" }, token),

  adminGetBlockedDates: (token: string) =>
    request<{ blockedDates: BlockedDate[] }>("/api/admin/availability/blocked", {}, token),

  adminGetHours: (token: string) =>
    request<{ hours: BusinessHour[] }>("/api/admin/availability/hours", {}, token),

  adminUpdateHours: (token: string, hours: BusinessHour[]) =>
    request("/api/admin/availability/hours", {
      method: "PUT",
      body: JSON.stringify({ hours }),
    }, token),

  adminCompleteBooking: (token: string, reference: string) =>
    request(`/api/admin/bookings/${reference}/complete`, { method: "PATCH" }, token),
};

export interface AdminBooking {
  id: string;
  reference: string;
  status: string;
  clientName: string;
  email: string;
  phone: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  totalFormatted: string;
  depositFormatted: string;
  depositPaidAt: string | null;
  hasAccount: boolean;
}

export interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
}

export interface BusinessHour {
  dayOfWeek: number;
  dayName: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export { ApiError };
