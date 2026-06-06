import type { ServiceCategory } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { penceToPounds } from "../utils/money.js";

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  NAILS: "Nails",
  TOE_NAILS: "Toe Nails",
  LASHES: "Lashes",
  EYEBROWS: "Eyebrows",
  PEDICURE: "Pedicure",
  MANICURE: "Manicure",
  ADD_ONS: "Add-ons",
};

const CATEGORY_ORDER: ServiceCategory[] = [
  "NAILS",
  "TOE_NAILS",
  "LASHES",
  "EYEBROWS",
  "PEDICURE",
  "MANICURE",
  "ADD_ONS",
];

export async function getAllServices(category?: ServiceCategory) {
  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      isAddOn: false,
      ...(category ? { category } : {}),
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const addOns = await prisma.service.findMany({
    where: { isActive: true, isAddOn: true },
    orderBy: { sortOrder: "asc" },
  });

  const formatted = services.map(formatService);
  const formattedAddOns = addOns.map(formatService);

  if (category) {
    return {
      category,
      categoryLabel: CATEGORY_LABELS[category],
      services: formatted,
      addOns: category === "ADD_ONS" ? formattedAddOns : undefined,
    };
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    categoryLabel: CATEGORY_LABELS[cat],
    services: formatted.filter((s) => s.category === cat),
  })).filter((g) => g.services.length > 0);

  return {
    categories: CATEGORY_ORDER.filter((cat) =>
      services.some((s) => s.category === cat)
    ).map((cat) => ({
      id: cat,
      label: CATEGORY_LABELS[cat],
    })),
    services: grouped,
    addOns: formattedAddOns,
  };
}

export async function getAddOns() {
  const addOns = await prisma.service.findMany({
    where: { isActive: true, isAddOn: true },
    orderBy: { sortOrder: "asc" },
  });

  return addOns.map(formatService);
}

function formatService(service: {
  id: string;
  name: string;
  description: string | null;
  pricePence: number;
  category: ServiceCategory;
  durationMin: number;
  gender: string | null;
  isAddOn: boolean;
}) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    category: service.category,
    categoryLabel: CATEGORY_LABELS[service.category],
    pricePence: service.pricePence,
    priceFormatted: penceToPounds(service.pricePence),
    durationMin: service.durationMin,
    gender: service.gender,
    isAddOn: service.isAddOn,
  };
}
