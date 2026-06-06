import Link from "next/link";
import { Sparkles, Heart, Star } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { images } from "@/lib/images";

const serviceCards = [
  { label: "Nails", href: "/services?category=NAILS", emoji: "💅" },
  { label: "Toe Nails", href: "/services?category=TOE_NAILS", emoji: "🦶" },
  { label: "Lashes", href: "/services?category=LASHES", emoji: "👁️" },
  { label: "Eyebrows", href: "/services?category=EYEBROWS", emoji: "✨" },
  { label: "Pedicure", href: "/services?category=PEDICURE", emoji: "🌸" },
  { label: "Manicure", href: "/services?category=MANICURE", emoji: "💎" },
];

const reviews = [
  { name: "Sophie M.", rating: 5, text: "Absolutely stunning lashes! The team made me feel so pampered. Will definitely be back." },
  { name: "Jessica L.", rating: 5, text: "Best nail salon I've ever been to. The ombre set was flawless and lasted weeks." },
  { name: "Amara T.", rating: 5, text: "Luxury experience from start to finish. Booking online was so easy too!" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
        <SafeImage
          src={images.hero}
          alt="Luxury nail art"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-deep-pink/70 via-hot-pink/50 to-transparent" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:text-left">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-white/90">
            Premium Beauty Salon
          </p>
          <h1 className="font-display text-4xl font-bold text-white sm:text-6xl lg:text-7xl">
            Luxury Beauty,<br />Your Way
          </h1>
          <p className="mt-4 max-w-lg text-lg text-white/90">
            Nails, lashes, brows & more — crafted with care in our glamorous pink paradise.
          </p>
          <Link
            href="/book"
            className="mt-8 inline-block rounded-full bg-white px-8 py-4 text-base font-bold text-hot-pink shadow-xl transition hover:scale-105 hover:shadow-2xl"
          >
            Book Your Appointment
          </Link>
        </div>
      </section>

      {/* Services Snapshot */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-center text-3xl font-semibold text-deep-pink">
            Our Services
          </h2>
          <p className="mt-2 text-center text-foreground/60">
            Everything you need to look and feel fabulous
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {serviceCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="group flex flex-col items-center rounded-2xl border border-blush bg-blush/30 p-6 transition hover:border-rose hover:bg-blush hover:shadow-md"
              >
                <span className="text-3xl">{card.emoji}</span>
                <span className="mt-3 text-sm font-semibold text-deep-pink group-hover:text-hot-pink">
                  {card.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-blush/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-center text-3xl font-semibold text-deep-pink">
            Why Choose Us
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { icon: Sparkles, title: "Premium Quality", desc: "Only the finest products and techniques for lasting, beautiful results." },
              { icon: Heart, title: "Expert Technicians", desc: "Skilled artists passionate about making you look and feel your best." },
              { icon: Star, title: "Luxury Experience", desc: "A glamorous, relaxing environment designed for your comfort." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blush">
                  <item.icon className="text-hot-pink" size={24} />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold text-deep-pink">{item.title}</h3>
                <p className="mt-2 text-sm text-foreground/60">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/about" className="text-sm font-semibold text-hot-pink hover:underline">
              Learn More →
            </Link>
          </div>
        </div>
      </section>

      {/* Portfolio — service-specific imagery */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-center text-3xl font-semibold text-deep-pink">
            Our Work
          </h2>
          <p className="mt-2 text-center text-foreground/60">
            Nails, lashes, brows &amp; beauty — crafted at Dollhouse Lounge
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
            {images.portfolio.map((item) => (
              <Link
                key={item.category}
                href={item.href}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl"
              >
                <SafeImage
                  src={item.src}
                  alt={item.label}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-pink/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                    {item.category}
                  </p>
                  <p className="font-display text-lg font-semibold text-white">
                    {item.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-center text-3xl font-semibold text-deep-pink">
            What Our Clients Say
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {reviews.map((review) => (
              <div key={review.name} className="rounded-2xl border border-blush p-6">
                <div className="flex gap-1 text-amber-400">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="mt-4 text-sm text-foreground/70 italic">&ldquo;{review.text}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-deep-pink">— {review.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-rose to-hot-pink py-16 text-center text-white">
        <h2 className="font-display text-3xl font-semibold">Ready to treat yourself?</h2>
        <p className="mt-2 text-white/90">Book your appointment in just a few clicks</p>
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
