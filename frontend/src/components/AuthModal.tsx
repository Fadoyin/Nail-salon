"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useAuth, getAuthErrorMessage } from "@/lib/auth";

export function AuthModal() {
  const router = useRouter();
  const {
    authModalOpen,
    authTab,
    closeAuth,
    setAuthTab,
    login,
    register,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (authModalOpen) {
      setError("");
      setSuccess("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [authModalOpen]);

  if (!authModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      router.push("/dashboard");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!registerForm.firstName || !registerForm.lastName || !registerForm.email || !registerForm.phone || !registerForm.password) {
      setError("Please fill in all fields");
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const message = await register(registerForm);
      setSuccess(message);
      router.push("/dashboard");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={closeAuth}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeAuth}
          className="absolute right-4 top-4 rounded-full p-1 text-foreground/40 transition hover:bg-blush hover:text-hot-pink"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="border-b border-blush px-6 pt-8">
          <h2 className="font-display text-2xl font-semibold text-deep-pink text-center mb-4">
            Welcome 🌸
          </h2>
          <div className="flex">
            <button
              onClick={() => { setAuthTab("login"); setError(""); }}
              className={`flex-1 pb-3 text-sm font-semibold transition border-b-2 ${
                authTab === "login"
                  ? "border-hot-pink text-hot-pink"
                  : "border-transparent text-foreground/50"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setAuthTab("register"); setError(""); }}
              className={`flex-1 pb-3 text-sm font-semibold transition border-b-2 ${
                authTab === "register"
                  ? "border-hot-pink text-hot-pink"
                  : "border-transparent text-foreground/50"
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {authTab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Email address</label>
                <input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink focus:ring-2 focus:ring-hot-pink/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink focus:ring-2 focus:ring-hot-pink/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-hot-pink py-3 text-sm font-semibold text-white transition hover:bg-deep-pink disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Login to My Account"}
              </button>
              <p className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => { closeAuth(); router.push("/forgot-password"); }}
                  className="text-foreground/50 hover:text-hot-pink hover:underline"
                >
                  Forgot password?
                </button>
              </p>
              <p className="text-center text-sm text-foreground/60">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthTab("register")}
                  className="font-semibold text-hot-pink hover:underline"
                >
                  Create one
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">First name</label>
                  <input
                    type="text"
                    required
                    value={registerForm.firstName}
                    onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                    className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink focus:ring-2 focus:ring-hot-pink/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Last name</label>
                  <input
                    type="text"
                    required
                    value={registerForm.lastName}
                    onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                    className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink focus:ring-2 focus:ring-hot-pink/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email address</label>
                <input
                  type="email"
                  required
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink focus:ring-2 focus:ring-hot-pink/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone number</label>
                <input
                  type="tel"
                  required
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink focus:ring-2 focus:ring-hot-pink/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink focus:ring-2 focus:ring-hot-pink/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Confirm password</label>
                <input
                  type="password"
                  required
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  className="w-full rounded-xl border border-blush px-4 py-3 text-sm outline-none focus:border-hot-pink focus:ring-2 focus:ring-hot-pink/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-hot-pink py-3 text-sm font-semibold text-white transition hover:bg-deep-pink disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create My Account"}
              </button>
              <p className="text-center text-sm text-foreground/60">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthTab("login")}
                  className="font-semibold text-hot-pink hover:underline"
                >
                  Login
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
