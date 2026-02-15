const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

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

  const categories = [
    { name: "Classic Manicure", category: "nails", durationMin: 45, price: 35, depositAmount: 15, description: "Shape, buff & polish." },
    { name: "Gel Extensions", category: "nails", durationMin: 90, price: 65, depositAmount: 25, description: "Full set gel nail extensions." },
    { name: "Classic Lash Extensions", category: "lash", durationMin: 90, price: 75, depositAmount: 30, description: "Natural volume lash set." },
    { name: "Volume Lashes", category: "lash", durationMin: 120, price: 95, depositAmount: 40, description: "Dramatic volume lash set." },
    { name: "Brows Microblading", category: "permanent-makeup", durationMin: 120, price: 250, depositAmount: 50, description: "Semi-permanent brow enhancement." },
    { name: "Lip Blush", category: "permanent-makeup", durationMin: 90, price: 120, depositAmount: 40, description: "Soft lip colour tattooing." },
  ];

  // Only create default services if they don't exist — never overwrite, so admin edits are preserved when you restart the app
  for (let i = 0; i < categories.length; i++) {
    const s = categories[i];
    const slug = s.name.toLowerCase().replace(/\s+/g, "-");
    const existing = await prisma.service.findUnique({ where: { id: slug } });
    if (!existing) {
      await prisma.service.create({
        data: {
          id: slug,
          name: s.name,
          category: s.category,
          position: i,
          durationMin: s.durationMin,
          price: s.price,
          depositAmount: s.depositAmount,
          description: s.description,
        },
      });
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
