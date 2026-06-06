"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/book", label: "Book" },
  { href: "/about", label: "About" },
];

export function Header() {
  const pathname = usePathname();
  const { user, openAuth, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-blush/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-hot-pink ${
                pathname === link.href ? "text-hot-pink" : "text-foreground/70"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href="/book"
                className="rounded-full bg-hot-pink px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-deep-pink"
              >
                Book Now
              </Link>
              <Link
                href="/dashboard"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose to-hot-pink text-sm font-bold text-white shadow-md transition hover:scale-105"
                title="My Dashboard"
              >
                {user.initials}
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuth("login")}
                className="text-sm font-medium text-foreground/70 transition hover:text-hot-pink"
              >
                Login
              </button>
              <button
                onClick={() => openAuth("register")}
                className="rounded-full border border-hot-pink px-4 py-2 text-sm font-semibold text-hot-pink transition hover:bg-blush"
              >
                Sign Up
              </button>
              <Link
                href="/book"
                className="rounded-full bg-hot-pink px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-deep-pink"
              >
                Book Now
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden rounded-lg p-2 text-hot-pink"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-blush bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-2 text-sm font-medium ${
                  pathname === link.href ? "text-hot-pink" : "text-foreground/70"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="py-2 text-sm font-medium text-hot-pink"
                >
                  My Dashboard ({user.initials})
                </Link>
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="py-2 text-left text-sm text-foreground/60"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { openAuth("login"); setMobileOpen(false); }}
                  className="py-2 text-left text-sm font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => { openAuth("register"); setMobileOpen(false); }}
                  className="py-2 text-left text-sm font-medium text-hot-pink"
                >
                  Sign Up
                </button>
              </>
            )}
            <Link
              href="/book"
              onClick={() => setMobileOpen(false)}
              className="mt-2 rounded-full bg-hot-pink py-3 text-center text-sm font-semibold text-white"
            >
              Book Now
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
