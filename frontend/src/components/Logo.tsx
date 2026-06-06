import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 group ${className}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose to-hot-pink text-white text-lg shadow-md">
        🌸
      </span>
      <div className="leading-tight">
        <span className="font-display text-xl font-semibold text-deep-pink block">
          Dollhouse
        </span>
        <span className="text-xs tracking-[0.2em] uppercase text-rose -mt-0.5 block">
          Lounge
        </span>
      </div>
    </Link>
  );
}
