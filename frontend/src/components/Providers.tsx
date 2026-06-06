"use client";

import { AuthProvider } from "@/lib/auth";
import { AuthModal } from "@/components/AuthModal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthModal />
    </AuthProvider>
  );
}
