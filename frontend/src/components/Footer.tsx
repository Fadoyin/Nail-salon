"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

function SocialIcon({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span className="text-foreground/50 transition hover:text-hot-pink" aria-label={label}>
      {children}
    </span>
  );
}

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="mt-auto border-t border-blush bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <Logo />

          <nav className="flex flex-col gap-2">
            <Link href="/" className="text-sm text-foreground/70 hover:text-hot-pink">Home</Link>
            <Link href="/services" className="text-sm text-foreground/70 hover:text-hot-pink">Services</Link>
            <Link href="/book" className="text-sm text-foreground/70 hover:text-hot-pink">Book</Link>
            <Link href="/about" className="text-sm text-foreground/70 hover:text-hot-pink">About</Link>
          </nav>

          <div>
            <p className="mb-4 text-sm font-medium text-deep-pink">Follow Us</p>
            <div className="flex gap-4">
              <a href="#" aria-label="Instagram">
                <SocialIcon label="Instagram">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
                </SocialIcon>
              </a>
              <a href="#" aria-label="TikTok">
                <SocialIcon label="TikTok">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                </SocialIcon>
              </a>
              <a href="#" aria-label="Facebook">
                <SocialIcon label="Facebook">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </SocialIcon>
              </a>
            </div>
            <a
              href="https://www.trustpilot.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-foreground/60 hover:text-hot-pink"
            >
              ⭐ Trustpilot Reviews
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-blush pt-6 text-center text-sm text-foreground/50">
          © 2026 Dollhouse Lounge
        </div>
      </div>
    </footer>
  );
}
