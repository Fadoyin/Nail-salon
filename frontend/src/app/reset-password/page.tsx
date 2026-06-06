"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api.resetPassword(token, password, confirmPassword);
      setSuccess(result.message);
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-600">Invalid reset link.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-hot-pink hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Confirm password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !!success}
          className="w-full rounded-full bg-hot-pink py-3 text-sm font-semibold text-white hover:bg-deep-pink disabled:opacity-60"
        >
          {loading ? "Updating..." : "Reset Password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-deep-pink text-center">
        Reset Password
      </h1>
      <p className="mt-3 text-center text-sm text-foreground/60">
        Choose a new password for your account.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-center">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
