"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

interface Admin {
  id: string;
  email: string;
  name: string;
}

interface AdminAuthContextValue {
  admin: Admin | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
const ADMIN_TOKEN_KEY = "dl_admin_token";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (stored) {
      setToken(stored);
      api.adminGetStats(stored).then(() => {
        // token valid — admin info from login stored separately
        const cached = localStorage.getItem("dl_admin_info");
        if (cached) setAdmin(JSON.parse(cached));
      }).catch(() => {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem("dl_admin_info");
        setToken(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.adminLogin(email, password);
    localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
    localStorage.setItem("dl_admin_info", JSON.stringify(result.admin));
    setToken(result.token);
    setAdmin(result.admin);
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem("dl_admin_info");
    setToken(null);
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, token, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
