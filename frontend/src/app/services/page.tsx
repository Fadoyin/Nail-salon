"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Service } from "@/types";

const CATEGORIES = [
  { id: "ALL", label: "All" },
  { id: "NAILS", label: "Nails" },
  { id: "TOE_NAILS", label: "Toe Nails" },
  { id: "LASHES", label: "Lashes" },
  { id: "EYEBROWS", label: "Eyebrows" },
  { id: "PEDICURE", label: "Pedicure" },
  { id: "MANICURE", label: "Manicure" },
];

interface ServiceGroup {
  category: string;
  categoryLabel: string;
  services: Service[];
}

function ServicesContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "ALL";
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [addOns, setAddOns] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveCategory(searchParams.get("category") ?? "ALL");
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (activeCategory === "ALL") {
          const data = await api.getServices() as {
            services: ServiceGroup[];
            addOns: Service[];
          };
          setGroups(data.services ?? []);
          setAddOns(data.addOns ?? []);
        } else {
          const data = await api.getServices(activeCategory) as {
            services: Service[];
          };
          setGroups([{
            category: activeCategory,
            categoryLabel: CATEGORIES.find((c) => c.id === activeCategory)?.label ?? activeCategory,
            services: data.services ?? [],
          }]);
          if (activeCategory !== "ADD_ONS") {
            const addOnData = await api.getAddOns();
            setAddOns(addOnData.addOns);
          }
        }
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeCategory]);

  return (
    <>
      <section className="bg-gradient-to-b from-blush/60 to-background py-12">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h1 className="font-display text-4xl font-bold text-deep-pink">Our Services</h1>
          <p className="mt-3 text-foreground/60">
            Browse our full menu of treatments and transparent pricing
          </p>
        </div>
      </section>

      <div className="sticky top-[73px] z-30 border-b border-blush bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 sm:px-6">
          <div className="flex gap-2 py-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeCategory === cat.id
                    ? "bg-hot-pink text-white shadow-md"
                    : "bg-blush/50 text-foreground/70 hover:bg-blush"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {loading ? (
          <div className="text-center text-foreground/50 py-20">Loading services...</div>
        ) : (
          <div className="space-y-12">
            {groups.map((group) => (
              <div key={group.category}>
                <h2 className="font-display text-2xl font-semibold text-deep-pink mb-6">
                  {group.categoryLabel}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.services.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-2xl border border-blush bg-white p-6 transition hover:border-rose hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold text-foreground">{service.name}</h3>
                        <span className="flex-shrink-0 rounded-full bg-blush px-3 py-1 text-sm font-bold text-deep-pink">
                          {service.priceFormatted}
                        </span>
                      </div>
                      {service.description && (
                        <p className="mt-2 text-sm text-foreground/60">{service.description}</p>
                      )}
                      {service.gender && service.gender !== "UNISEX" && (
                        <p className="mt-2 text-xs text-foreground/40 capitalize">
                          {service.gender.toLowerCase()}
                        </p>
                      )}
                      <Link
                        href={`/book?service=${service.id}&category=${service.category}`}
                        className="mt-4 inline-block text-sm font-semibold text-hot-pink hover:underline"
                      >
                        Book this →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {addOns.length > 0 && activeCategory === "ALL" && (
              <div className="rounded-2xl border-2 border-dashed border-rose bg-blush/30 p-8">
                <h2 className="font-display text-2xl font-semibold text-deep-pink">Add-ons</h2>
                <p className="mt-2 text-sm text-foreground/60">
                  Starting from £5 depending on requirement
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {addOns.map((addon) => (
                    <div key={addon.id} className="flex justify-between rounded-xl bg-white px-4 py-3">
                      <span className="text-sm font-medium">{addon.name}</span>
                      <span className="text-sm font-bold text-deep-pink">{addon.priceFormatted}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="bg-gradient-to-r from-rose to-hot-pink py-12 text-center text-white">
        <h2 className="font-display text-2xl font-semibold">Ready to treat yourself?</h2>
        <Link
          href="/book"
          className="mt-4 inline-block rounded-full bg-white px-8 py-3 font-bold text-hot-pink shadow-lg transition hover:scale-105"
        >
          Book Now
        </Link>
      </section>
    </>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center">Loading...</div>}>
      <ServicesContent />
    </Suspense>
  );
}
