"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "@/lib/admin-auth";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { api } from "@/lib/api";
import { AdminLayout, type AdminSection } from "@/components/admin/AdminLayout";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminAppointments } from "@/components/admin/AdminAppointments";
import { AdminClients } from "@/components/admin/AdminClients";
import { AdminPayments } from "@/components/admin/AdminPayments";
import { AdminAvailability } from "@/components/admin/AdminAvailability";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { AdminSettings } from "@/components/admin/AdminSettings";

function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { admin, token, loading: authLoading, logout } = useAdminAuth();
  const [section, setSection] = useState<AdminSection>(
    (searchParams.get("section") as AdminSection) || "overview"
  );
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof api.adminGetOverview>> | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useInactivityLogout(() => {
    logout();
    router.push("/admin/login");
  }, Boolean(admin));

  useEffect(() => {
    if (!authLoading && !admin) router.push("/admin/login");
  }, [authLoading, admin, router]);

  const refreshMeta = async () => {
    if (!token) return;
    try {
      const [ov, notif] = await Promise.all([
        api.adminGetOverview(token),
        api.adminGetNotifications(token),
      ]);
      setOverview(ov);
      setUnreadCount(notif.unreadCount);
    } catch {
      logout();
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMeta();
  }, [token]);

  const handleSectionChange = (s: AdminSection) => {
    setSection(s);
    router.replace(`/admin?section=${s}`, { scroll: false });
  };

  if (authLoading || !admin || !token) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <AdminLayout
      adminName={admin.name}
      section={section}
      onSectionChange={handleSectionChange}
      unreadNotifications={unreadCount}
      onLogout={() => { logout(); router.push("/admin/login"); }}
    >
      {loading && section === "overview" ? (
        <p className="text-foreground/50">Loading...</p>
      ) : (
        <>
          {section === "overview" && overview && (
            <AdminOverview data={overview} onNavigate={handleSectionChange} />
          )}
          {section === "appointments" && (
            <AdminAppointments token={token} onRefresh={refreshMeta} />
          )}
          {section === "clients" && <AdminClients token={token} />}
          {section === "payments" && <AdminPayments token={token} />}
          {section === "availability" && <AdminAvailability token={token} />}
          {section === "notifications" && (
            <AdminNotifications token={token} onRead={refreshMeta} />
          )}
          {section === "settings" && (
            <AdminSettings
              token={token}
              onProfileUpdate={(name) => {
                const cached = localStorage.getItem("dl_admin_info");
                if (cached) {
                  const info = JSON.parse(cached);
                  localStorage.setItem("dl_admin_info", JSON.stringify({ ...info, name }));
                }
              }}
            />
          )}
        </>
      )}
    </AdminLayout>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <AdminDashboard />
    </Suspense>
  );
}
