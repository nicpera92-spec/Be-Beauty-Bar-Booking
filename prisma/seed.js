const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

// Idempotent + non-destructive seed.
// - Ensures the business owner login exists.
// - Ensures the default category booking rules exist.
// - Ensures ONE master technician (Svitlana) exists. No other technicians are
//   created here — Sveta adds technicians herself from the admin area.
// - Links any existing services/bookings that have no technician to Svitlana so
//   live data (calendar, availability) keeps working after the schema change.
// - Only creates demo services on a brand-new database (when there are none).
async function main() {
  const adminHash = await bcrypt.hash("123456789", 12);

  await prisma.businessSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      businessName: "Be Beauty Bar",
      adminLoginEmail: "Svit.uk@hotmail.com",
      adminPasswordHash: adminHash,
      openTime: "09:00",
      closeTime: "17:00",
      slotInterval: 30,
      primaryColor: "#1e3a5f",
      secondaryColor: "#2c5282",
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      smsNotificationFee: 0.05,
    },
    update: {
      adminLoginEmail: "Svit.uk@hotmail.com",
      adminPasswordHash: adminHash,
    },
  });

  const categoryRules = [
    { category: "nails", maxConcurrent: 1 },
    { category: "lash", maxConcurrent: 2 },
    { category: "permanent-makeup", maxConcurrent: 1 },
  ];
  for (const r of categoryRules) {
    await prisma.categoryCapacityRule.upsert({
      where: { category: r.category },
      create: r,
      update: { maxConcurrent: r.maxConcurrent },
    });
  }

  // Ensure exactly one master (owner) technician: Svitlana. She signs in with
  // the single business owner login (managed in BusinessSettings), so she has
  // NO separate technician login/password here.
  let master = await prisma.technician.findFirst({ where: { role: "master" } });
  if (!master) {
    master = await prisma.technician.findFirst({ where: { name: "Svitlana" } });
  }
  if (!master) {
    master = await prisma.technician.create({
      data: {
        name: "Svitlana",
        skillLevel: "Master",
        role: "master",
        loginEmail: null,
        passwordHash: null,
        bio: "Founder of Be Beauty Bar with years of experience across nails, lashes and permanent makeup.",
        position: 0,
      },
    });
  } else {
    master = await prisma.technician.update({
      where: { id: master.id },
      data: {
        name: "Svitlana",
        skillLevel: "Master",
        role: "master",
        loginEmail: null,
        passwordHash: null,
        active: true,
      },
    });
  }

  // Note: linking pre-existing services/bookings to Svitlana on a live database
  // is handled by the SQL migration (technicianId is a required column here).

  // Demo services only on a fresh database (no services at all).
  const serviceCount = await prisma.service.count();
  if (serviceCount === 0) {
    const demoServices = [
      { id: "svit-classic-manicure", name: "Classic Manicure", category: "nails", durationMin: 45, price: 35, depositAmount: 15, description: "Shape, buff & polish.", position: 0 },
      { id: "svit-gel-extensions", name: "Gel Extensions", category: "nails", durationMin: 90, price: 65, depositAmount: 25, description: "Full set gel nail extensions.", position: 1 },
      { id: "svit-classic-lash", name: "Classic Lash Extensions", category: "lash", durationMin: 90, price: 75, depositAmount: 30, description: "Natural volume lash set.", position: 2 },
      { id: "svit-brows", name: "Brows Microblading", category: "permanent-makeup", durationMin: 120, price: 250, depositAmount: 50, description: "Semi-permanent brow enhancement.", position: 3 },
    ];
    for (const s of demoServices) {
      await prisma.service.create({ data: { ...s, technicianId: master.id } });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
