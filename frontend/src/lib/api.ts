export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

  adminGetOverview: (token: string) => request<AdminOverview>("/api/admin/overview", {}, token),

  adminGetAppointments: (token: string, params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ bookings: AdminBooking[] }>(`/api/admin/appointments${q}`, {}, token);
  },

  adminManualBooking: (token: string, body: Record<string, unknown>) =>
    request("/api/admin/appointments/manual", { method: "POST", body: JSON.stringify(body) }, token),

  adminUpdateAppointmentStatus: (token: string, reference: string, status: string) =>
    request(`/api/admin/appointments/${reference}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, token),

  adminUpdateAppointmentNotes: (token: string, reference: string, internalNotes: string) =>
    request(`/api/admin/appointments/${reference}/notes`, { method: "PATCH", body: JSON.stringify({ internalNotes }) }, token),

  adminRescheduleAppointment: (token: string, reference: string, date: string, time: string) =>
    request(`/api/admin/appointments/${reference}/reschedule`, { method: "POST", body: JSON.stringify({ date, time }) }, token),

  adminCancelAppointment: (token: string, reference: string, reason?: string) =>
    request(`/api/admin/appointments/${reference}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }, token),

  adminCompleteBooking: (token: string, reference: string) =>
    request(`/api/admin/appointments/${reference}/complete`, { method: "PATCH" }, token),

  adminGetClients: (token: string, search?: string, sortBy?: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (sortBy) params.set("sortBy", sortBy);
    const q = params.toString() ? `?${params}` : "";
    return request<{ clients: AdminClient[] }>(`/api/admin/clients${q}`, {}, token);
  },

  adminGetClient: (token: string, id: string) =>
    request<{ client: AdminClientDetail }>(`/api/admin/clients/${id}`, {}, token),

  adminUpdateClientNotes: (token: string, id: string, internalNotes: string) =>
    request(`/api/admin/clients/${id}/notes`, { method: "PATCH", body: JSON.stringify({ internalNotes }) }, token),

  adminGetPaymentsOverview: (token: string) => request<AdminPaymentsOverview>("/api/admin/payments/overview", {}, token),

  adminGetPayments: (token: string, params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ payments: AdminPayment[] }>(`/api/admin/payments${q}`, {}, token);
  },

  adminIssueRefund: (token: string, reference: string, amountPence?: number, reason?: string) =>
    request<{ reference: string; refundFormatted: string; message: string }>(
      `/api/admin/payments/${reference}/refund`,
      { method: "POST", body: JSON.stringify({ amountPence, reason }) },
      token
    ),

  adminExportPayments: (token: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return fetch(`${API_URL}/api/admin/payments/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.text());
  },

  adminExportPaymentsPdf: async (token: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`${API_URL}/api/admin/payments/export/pdf?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new ApiError("Export failed", res.status);
    return res.blob();
  },

  adminGetNotifications: (token: string) =>
    request<{ notifications: AdminNotification[]; unreadCount: number }>("/api/admin/notifications", {}, token),

  adminMarkNotificationRead: (token: string, id: string) =>
    request(`/api/admin/notifications/${id}/read`, { method: "PATCH" }, token),

  adminMarkAllNotificationsRead: (token: string) =>
    request("/api/admin/notifications/read-all", { method: "PATCH" }, token),

  adminBlockDate: (token: string, date: string, reason?: string) =>
    request("/api/admin/availability/blocked", { method: "POST", body: JSON.stringify({ date, reason }) }, token),

  adminUnblockDate: (token: string, id: string) =>
    request(`/api/admin/availability/blocked/${id}`, { method: "DELETE" }, token),

  adminGetBlockedDates: (token: string) =>
    request<{ blockedDates: BlockedDate[] }>("/api/admin/availability/blocked", {}, token),

  adminGetBlockedSlots: (token: string) =>
    request<{ blockedSlots: BlockedTimeSlot[] }>("/api/admin/availability/blocked-slots", {}, token),

  adminBlockTimeSlot: (token: string, date: string, startTime: string, endTime: string, reason?: string) =>
    request("/api/admin/availability/blocked-slots", { method: "POST", body: JSON.stringify({ date, startTime, endTime, reason }) }, token),

  adminUnblockTimeSlot: (token: string, id: string) =>
    request(`/api/admin/availability/blocked-slots/${id}`, { method: "DELETE" }, token),

  adminGetHours: (token: string) =>
    request<{ hours: BusinessHour[] }>("/api/admin/availability/hours", {}, token),

  adminUpdateHours: (token: string, hours: BusinessHour[]) =>
    request("/api/admin/availability/hours", { method: "PUT", body: JSON.stringify({ hours }) }, token),

  adminGetAvailabilitySettings: (token: string) =>
    request<{ bufferMinutes: number; leadTimeHours: number }>("/api/admin/availability/settings", {}, token),

  adminUpdateAvailabilitySettings: (token: string, bufferMinutes: number, leadTimeHours: number) =>
    request("/api/admin/availability/settings", { method: "PUT", body: JSON.stringify({ bufferMinutes, leadTimeHours }) }, token),

  adminGetSettings: (token: string) => request<AdminSettings>("/api/admin/settings", {}, token),

  adminUpdateProfile: (token: string, body: Record<string, unknown>) =>
    request("/api/admin/settings/profile", { method: "PATCH", body: JSON.stringify(body) }, token),

  adminUpdateBusinessSettings: (token: string, body: Record<string, unknown>) =>
    request("/api/admin/settings/business", { method: "PATCH", body: JSON.stringify(body) }, token),

  adminUpdateEmailTemplates: (token: string, body: Record<string, unknown>) =>
    request("/api/admin/settings/email-templates", { method: "PATCH", body: JSON.stringify(body) }, token),

  adminUploadLogo: async (token: string, file: File) => {
    const form = new FormData();
    form.append("logo", file);
    const res = await fetch(`${API_URL}/api/admin/settings/logo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error ?? "Upload failed", res.status);
    return data as { logoUrl: string };
  },

  adminGetServices: () => request<{ services: { category: string; categoryLabel: string; services: { id: string; name: string; priceFormatted: string }[] }[] }>("/api/services"),
};

export interface AdminOverview {
  stats: Record<string, string | number>;
  todaySchedule: {
    reference: string;
    clientName: string;
    service: string;
    time: string;
    depositFormatted: string;
    depositPaid: boolean;
    status: string;
  }[];
}

export interface AdminBooking {
  id: string;
  reference: string;
  status: string;
  clientName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  serviceName: string;
  serviceId?: string;
  appointmentDate: string;
  appointmentTime: string;
  totalFormatted: string;
  depositFormatted: string;
  remainingFormatted?: string;
  depositPaidAt: string | null;
  internalNotes?: string | null;
  isManualBooking?: boolean;
  userId?: string | null;
  durationMin?: number;
}

export interface AdminClient {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  bookingCount: number;
  totalSpentFormatted: string;
  lastVisit: string | null;
  internalNotes: string | null;
}

export interface AdminClientDetail extends AdminClient {
  createdAt: string;
  bookings: { reference: string; service: string; date: string; time: string; totalFormatted: string; status: string }[];
}

export interface AdminPaymentsOverview {
  revenueWeekFormatted: string;
  revenueMonthFormatted: string;
  revenueAllTimeFormatted: string;
  depositsCollectedFormatted: string;
  outstandingFormatted: string;
  refundsIssuedFormatted: string;
}

export interface AdminPayment {
  reference: string;
  client: string;
  service: string;
  date: string;
  totalFormatted: string;
  depositFormatted: string;
  remainingFormatted: string;
  refundFormatted: string | null;
  depositPence?: number;
  refundPence?: number;
  status: string;
  paymentStatus: string;
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  linkPath: string | null;
  createdAt: string;
}

export interface BlockedTimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface AdminSettings {
  profile: { id: string; name: string; email: string };
  business: Record<string, string | null>;
  booking: { depositPercentage: number; cancellationHours: number; bufferMinutes: number; leadTimeHours: number };
  email: Record<string, boolean>;
  templates: {
    bookingConfirm: EmailTemplate;
    reminder: EmailTemplate;
    review: EmailTemplate;
    cancellation: EmailTemplate;
  };
  placeholderHint: string;
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
