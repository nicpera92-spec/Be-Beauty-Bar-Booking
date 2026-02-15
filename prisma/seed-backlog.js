/**
 * One-time script to add backlog bookings from spreadsheet.
 * Run: node prisma/seed-backlog.js
 * Requires: DATABASE_URL in .env
 *
 * These bookings appear on the admin calendar and block those times
 * from being available for new customer bookings.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const totalM = h * 60 + m + minutes;
  const nh = Math.floor(totalM / 60) % 24;
  const nm = totalM % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

const BACKLOG_BOOKINGS = [
  { date: "2026-02-21", time: "09:00", durationMin: 120, clientService: "beautyluvu nails" },
  { date: "2026-02-21", time: "15:00", durationMin: 150, clientService: "Диана Фененко ресницы" },
  { date: "2026-02-21", time: "17:30", durationMin: 150, clientService: "Justyna lashes" },
  { date: "2026-02-21", time: "19:30", durationMin: 150, clientService: "Иероглифы lashes" },
  { date: "2026-02-22", time: "11:00", durationMin: 120, clientService: "Маник Victoriia" },
  { date: "2026-02-22", time: "13:00", durationMin: 120, clientService: "Ногти Александра" },
  { date: "2026-02-22", time: "17:00", durationMin: 120, clientService: "Ногти Mrs Olena" },
  { date: "2026-02-22", time: "19:00", durationMin: 120, clientService: "Royal nails" },
  { date: "2026-02-23", time: "11:00", durationMin: 150, clientService: "анна ресницы депощит не оплачен" },
  { date: "2026-02-23", time: "16:00", durationMin: 120, clientService: "Ольга ногти" },
  { date: "2026-02-23", time: "18:30", durationMin: 150, clientService: "Headtotoeessentials lashes" },
  { date: "2026-02-24", time: "13:00", durationMin: 120, clientService: "Dianneconnor4 nails" },
  { date: "2026-02-26", time: "09:00", durationMin: 150, clientService: "v_ee_mufaro lashes" },
  { date: "2026-02-26", time: "19:00", durationMin: 120, clientService: "lizahurombo nails" },
  { date: "2026-02-27", time: "03:36", durationMin: 120, clientService: "Vicki nails" },
  { date: "2026-02-28", time: "13:00", durationMin: 150, clientService: "Ollena_k ресницы" },
  { date: "2026-03-01", time: "11:00", durationMin: 120, clientService: "Ollena_k nails" },
  { date: "2026-03-01", time: "13:00", durationMin: 120, clientService: "Ollena_k дочь ногти" },
];

async function main() {
  const service = await prisma.service.findFirst({ where: { active: true } });
  if (!service) {
    throw new Error("No active service found. Run db:seed first to create services.");
  }

  let created = 0;
  let skipped = 0;

  for (const b of BACKLOG_BOOKINGS) {
    const endTime = addMinutes(b.time, b.durationMin);

    const existing = await prisma.booking.findFirst({
      where: {
        date: b.date,
        startTime: b.time,
        customerName: b.clientService,
        status: { not: "cancelled" },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.booking.create({
      data: {
        serviceId: service.id,
        customerName: b.clientService,
        customerEmail: null,
        customerPhone: null,
        date: b.date,
        startTime: b.time,
        endTime,
        servicePrice: 0,
        depositAmount: 0,
        status: "confirmed",
        notes: "Backlog import",
        notifyByEmail: false,
        notifyBySMS: false,
      },
    });
    created++;
  }

  console.log(`Backlog seed complete: ${created} created, ${skipped} skipped (already exist).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
