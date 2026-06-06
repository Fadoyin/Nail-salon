import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import { images } from "@/lib/images";
import { Shield, Gem, Smile, HandHeart } from "lucide-react";

const values = [
  { icon: Gem, title: "Quality", desc: "We never compromise on products, technique, or attention to detail." },
  { icon: Smile, title: "Confidence", desc: "Every treatment is designed to help you feel beautiful and empowered." },
  { icon: Shield, title: "Luxury", desc: "A premium salon experience that feels as good as it looks." },
  { icon: HandHeart, title: "Care", desc: "Your comfort and satisfaction are at the heart of everything we do." },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative flex h-64 items-end overflow-hidden sm:h-80">
        <SafeImage
          src={images.aboutHero}
          alt="Beauty lifestyle"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep-pink/80 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
            About Dollhouse Lounge
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-semibold text-deep-pink">Our Story</h2>
        <p className="mt-4 text-foreground/70 leading-relaxed">
          Welcome to Dollhouse Lounge — where luxury meets artistry. Born from a passion for
          beautiful nails, flawless lashes, and perfectly sculpted brows, we created a space
          where every client is treated like royalty.
        </p>
        <p className="mt-4 text-foreground/70 leading-relaxed">
          Our pink paradise is more than a salon — it&apos;s a destination. From the moment you
          walk through our doors (or book online), you&apos;ll experience the glamour, warmth, and
          expert care that sets Dollhouse Lounge apart. We believe everyone deserves to feel
          fabulous, and we&apos;re here to make that happen.
        </p>
      </section>

      <section className="bg-blush/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-center text-3xl font-semibold text-deep-pink">
            What We Stand For
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blush">
                  <v.icon className="text-hot-pink" size={22} />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-deep-pink">{v.title}</h3>
                <p className="mt-2 text-sm text-foreground/60">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 text-center">
        <h2 className="font-display text-2xl font-semibold text-deep-pink">
          See what our clients say
        </h2>
        <a
          href="https://www.trustpilot.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-hot-pink font-semibold hover:underline"
        >
          ⭐ Read our Trustpilot reviews →
        </a>
      </section>

      <section className="bg-gradient-to-r from-rose to-hot-pink py-16 text-center text-white">
        <h2 className="font-display text-3xl font-semibold">Ready to glow?</h2>
        <Link
          href="/book"
          className="mt-6 inline-block rounded-full bg-white px-8 py-3 font-bold text-hot-pink shadow-lg transition hover:scale-105"
        >
          Book Now
        </Link>
      </section>
    </>
  );
}
