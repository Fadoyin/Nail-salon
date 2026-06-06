export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  initials: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  categoryLabel: string;
  pricePence: number;
  priceFormatted: string;
  durationMin: number;
  gender: string | null;
  isAddOn: boolean;
}

export interface ServiceCategory {
  id: string;
  label: string;
}

export interface TimeSlot {
  time: string;
  displayTime: string;
}

export interface BookingCard {
  id: string;
  reference: string;
  serviceName: string;
  services: { name: string; priceFormatted: string }[];
  addOns: { name: string; priceFormatted: string }[];
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  displayStatus: "upcoming" | "completed" | "cancelled" | "pending";
  depositPence: number;
  depositFormatted: string;
  remainingPence: number;
  remainingFormatted: string;
  totalPence: number;
  totalFormatted: string;
  depositPaidAt: string | null;
  durationMin: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  bookingId: string | null;
  createdAt: string;
  timestamp: string;
}

export interface DashboardOverview {
  greeting: string;
  stats: {
    upcomingAppointments: number;
    completedBookings: number;
    totalSpentPence: number;
    totalSpentFormatted: string;
    yourRating: null;
    ratingNote: string;
  };
  nextAppointment: BookingCard | null;
  recentActivity: BookingCard[];
  unreadNotifications: number;
  trustpilotUrl: string;
}

export type DashboardSection =
  | "overview"
  | "appointments"
  | "history"
  | "notifications"
  | "profile";

export type AuthTab = "login" | "register";
