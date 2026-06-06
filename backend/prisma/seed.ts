import { PrismaClient, ServiceCategory, GenderPricing } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

const services = [
  // Lashes
  { name: "Nano Classic", category: ServiceCategory.LASHES, pricePence: 3500, durationMin: 90, sortOrder: 1 },
  { name: "Wispy", category: ServiceCategory.LASHES, pricePence: 6500, durationMin: 120, sortOrder: 2 },
  { name: "Wispy Volume Hybrid", category: ServiceCategory.LASHES, pricePence: 4500, durationMin: 120, sortOrder: 3 },
  { name: "Volume", category: ServiceCategory.LASHES, pricePence: 5500, durationMin: 120, sortOrder: 4 },
  { name: "Mega Volume", category: ServiceCategory.LASHES, pricePence: 6500, durationMin: 150, sortOrder: 5 },
  {
    name: "Lash Customisation",
    category: ServiceCategory.LASHES,
    pricePence: 1000,
    durationMin: 15,
    isAddOn: true,
    description: "Add-on customisation for lash sets",
    sortOrder: 6,
  },
  {
    name: "Lower Lashes Set Only",
    category: ServiceCategory.LASHES,
    pricePence: 1000,
    durationMin: 30,
    isAddOn: true,
    sortOrder: 7,
  },

  // Eyebrows
  {
    name: "Full Set (2–3 hrs)",
    category: ServiceCategory.EYEBROWS,
    pricePence: 11000,
    durationMin: 150,
    description: "Ombre brows full set",
    sortOrder: 1,
  },
  {
    name: "Touch Up",
    category: ServiceCategory.EYEBROWS,
    pricePence: 8000,
    durationMin: 90,
    description: "Ombre brows touch up",
    sortOrder: 2,
  },

  // Nails (Acrylic)
  {
    name: "Full Set One Colour (short/medium)",
    category: ServiceCategory.NAILS,
    pricePence: 3000,
    durationMin: 60,
    sortOrder: 1,
  },
  {
    name: "French Tips Full Set (short/medium)",
    category: ServiceCategory.NAILS,
    pricePence: 3500,
    durationMin: 75,
    sortOrder: 2,
  },
  { name: "Full Set Ombre", category: ServiceCategory.NAILS, pricePence: 3500, durationMin: 75, sortOrder: 3 },
  { name: "Biab", category: ServiceCategory.NAILS, pricePence: 3200, durationMin: 60, sortOrder: 4 },

  // Toe Nails
  { name: "Acrylic Full Set", category: ServiceCategory.TOE_NAILS, pricePence: 2500, durationMin: 45, sortOrder: 1 },
  { name: "French Tips", category: ServiceCategory.TOE_NAILS, pricePence: 3000, durationMin: 60, sortOrder: 2 },

  // Pedicure
  {
    name: "Pedicure",
    category: ServiceCategory.PEDICURE,
    pricePence: 4000,
    durationMin: 45,
    gender: GenderPricing.WOMEN,
    sortOrder: 1,
  },
  {
    name: "Pedicure",
    category: ServiceCategory.PEDICURE,
    pricePence: 4500,
    durationMin: 45,
    gender: GenderPricing.MEN,
    sortOrder: 2,
  },

  // Manicure
  {
    name: "Manicure",
    category: ServiceCategory.MANICURE,
    pricePence: 3000,
    durationMin: 30,
    gender: GenderPricing.UNISEX,
    sortOrder: 1,
  },

  // Add-ons
  {
    name: "Nail Art",
    category: ServiceCategory.ADD_ONS,
    pricePence: 500,
    durationMin: 15,
    isAddOn: true,
    description: "From £5 depending on requirement",
    sortOrder: 1,
  },
  {
    name: "Extra Length",
    category: ServiceCategory.ADD_ONS,
    pricePence: 500,
    durationMin: 0,
    isAddOn: true,
    description: "From £5 depending on requirement",
    sortOrder: 2,
  },
  {
    name: "Ad Terms",
    category: ServiceCategory.ADD_ONS,
    pricePence: 300,
    durationMin: 0,
    isAddOn: true,
    description: "From £3",
    sortOrder: 3,
  },
];

const businessHours = [
  { dayOfWeek: 0, isClosed: true, openTime: "00:00", closeTime: "00:00" },
  { dayOfWeek: 1, openTime: "10:00", closeTime: "18:00", isClosed: false },
  { dayOfWeek: 2, openTime: "10:00", closeTime: "18:00", isClosed: false },
  { dayOfWeek: 3, openTime: "10:00", closeTime: "18:00", isClosed: false },
  { dayOfWeek: 4, openTime: "10:00", closeTime: "18:00", isClosed: false },
  { dayOfWeek: 5, openTime: "10:00", closeTime: "18:00", isClosed: false },
  { dayOfWeek: 6, openTime: "10:00", closeTime: "16:00", isClosed: false },
];

async function main() {
  console.log("Seeding Dollhouse Lounge database...");

  await prisma.bookingAddOn.deleteMany();
  await prisma.bookingService.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.service.deleteMany();
  await prisma.businessHours.deleteMany();
  await prisma.blockedDate.deleteMany();

  for (const service of services) {
    await prisma.service.create({ data: service });
  }

  for (const hours of businessHours) {
    await prisma.businessHours.create({ data: hours });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "owner@dollhouselounge.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme123";
  const adminName = process.env.ADMIN_NAME ?? "Salon Owner";

  await prisma.salonSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      businessName: "Dollhouse Lounge",
      contactEmail: "bookings@dollhouselounge.com",
      depositPercentage: 50,
      cancellationHours: 48,
      bufferMinutes: 15,
      leadTimeHours: 24,
    },
    update: {},
  });

  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.admin.create({
      data: { email: adminEmail, passwordHash, name: adminName },
    });
    console.log(`Created admin account: ${adminEmail}`);
  }

  console.log(`Seeded ${services.length} services and ${businessHours.length} business hour entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
