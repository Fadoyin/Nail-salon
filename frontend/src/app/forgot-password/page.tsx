"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setDevUrl(null);
    try {
      const result = await api.forgotPassword(email);
      setMessage(result.message);
      if (result.devResetUrl) setDevUrl(result.devResetUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-deep-pink text-center">
        Forgot Password
      </h1>
      <p className="mt-3 text-center text-sm text-foreground/60">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {message && (
        <div className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
          {devUrl && (
            <p className="mt-2 break-all text-xs">
              <strong>Dev mode (email not configured):</strong>{" "}
              <a href={devUrl} className="text-hot-pink underline">Click here to reset</a>
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink focus:ring-2 focus:ring-hot-pink/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-hot-pink py-3 text-sm font-semibold text-white hover:bg-deep-pink disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground/60">
        <Link href="/" className="text-hot-pink hover:underline">← Back to home</Link>
      </p>
    </div>
  );
}
