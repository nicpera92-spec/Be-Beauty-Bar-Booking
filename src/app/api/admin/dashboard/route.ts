import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth";
import { computeDashboardStats, type StatsBooking } from "@/lib/dashboardStats";
import { contactKeyForBooking } from "@/lib/rebookReminder";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366 * 3;

export async function GET(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json({ error: "Only the owner can view business stats" }, { status: 403 });
  }

  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
    return NextResponse.json({ error: "from and to (yyyy-MM-dd) required" }, { status: 400 });
  }
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (days > MAX_RANGE_DAYS) {
    return NextResponse.json({ error: "Please choose a range of 3 years or less." }, { status: 400 });
  }

  // Optional: one technician's stats. New/returning still means new to the salon.
  const technicianParam = req.nextUrl.searchParams.get("technicianId");
  const technicianId = technicianParam && technicianParam !== "all" ? technicianParam : null;
  const byTechnician = technicianId ? { technicianId } : {};

  const [inRange, confirmedHistory, waitlistJoined, waitlistBooked] = await Promise.all([
    prisma.booking.findMany({
      where: { date: { gte: from, lte: to }, ...byTechnician },
      select: {
        id: true,
        date: true,
        startTime: true,
        status: true,
        servicePrice: true,
        depositAmount: true,
        balancePaidOnline: true,
        depositRefundedAt: true,
        customerCancelledAt: true,
        rescheduleCount: true,
        stripeDepositPaymentIntentId: true,
        customerEmail: true,
        customerPhone: true,
        service: { select: { name: true } },
        technician: { select: { name: true } },
      },
    }),
    prisma.booking.findMany({
      where: { status: "confirmed", date: { lte: to } },
      select: { date: true, customerEmail: true, customerPhone: true },
      orderBy: { date: "asc" },
    }),
    prisma.waitingListEntry.count({
      where: {
        createdAt: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T23:59:59Z`) },
        ...byTechnician,
      },
    }),
    prisma.waitingListEntry.count({
      where: {
        ...byTechnician,
        status: "fulfilled",
        updatedAt: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T23:59:59Z`) },
      },
    }),
  ]);

  const firstVisit = new Map<string, string>();
  for (const b of confirmedHistory) {
    const key = contactKeyForBooking(b);
    if (key && !firstVisit.has(key)) firstVisit.set(key, b.date);
  }

  const bookings: StatsBooking[] = inRange.map((b) => ({
    ...b,
    serviceName: b.service.name,
    technicianName: b.technician.name,
  }));
  const stats = computeDashboardStats(bookings, contactKeyForBooking, firstVisit);

  return NextResponse.json({ from, to, ...stats, waitlistJoined, waitlistBooked });
}
