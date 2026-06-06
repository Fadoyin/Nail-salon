"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminAuth } from "@/lib/admin-auth";
import { ApiError } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const { admin, loading, login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && admin) router.push("/admin");
  }, [loading, admin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email, password);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blush/40 to-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-blush bg-white p-8 shadow-xl">
        <div className="text-center">
          <span className="text-3xl">🌸</span>
          <h1 className="mt-2 font-display text-2xl font-bold text-deep-pink">Owner Login</h1>
          <p className="mt-1 text-sm text-foreground/50">Dollhouse Lounge Admin</p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-deep-pink py-3 text-sm font-semibold text-white hover:bg-hot-pink disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-foreground/40">
          <Link href="/" className="hover:text-hot-pink">← Back to website</Link>
        </p>
      </div>
    </div>
  );
}
