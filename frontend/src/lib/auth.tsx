"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api";
import type { AuthTab, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  authModalOpen: boolean;
  authTab: AuthTab;
  openAuth: (tab?: AuthTab) => void;
  closeAuth: () => void;
  setAuthTab: (tab: AuthTab) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }) => Promise<string>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "dl_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("login");

  const persistToken = useCallback((newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const { user: me } = await api.getMe(stored);
      setUser(me);
      setToken(stored);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const result = await api.login({ email, password });
    persistToken(result.token);
    setUser(result.user);
    setAuthModalOpen(false);
  };

  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }) => {
    const result = await api.register(data);
    persistToken(result.token);
    setUser(result.user);
    setAuthModalOpen(false);
    return result.message;
  };

  const logout = () => {
    persistToken(null);
    setUser(null);
  };

  const openAuth = (tab: AuthTab = "login") => {
    setAuthTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuth = () => setAuthModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authModalOpen,
        authTab,
        openAuth,
        closeAuth,
        setAuthTab,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getAuthErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "INVALID_CREDENTIALS") return "Invalid email or password";
    if (err.code === "EMAIL_EXISTS") return "Email already registered";
    if (err.details) {
      const first = Object.values(err.details)[0]?.[0];
      if (first) return first;
    }
    return err.message;
  }
  return "Something went wrong. Please try again.";
}
