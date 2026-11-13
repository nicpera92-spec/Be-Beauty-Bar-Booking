import { NextRequest, NextResponse } from "next/server";
import { format, parse, subYears } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth";
import {
  computeDashboardStats,
  previousPeriod,
  yearOnYear,
  type StatsBooking,
} from "@/lib/dashboardStats";
import { contactKeyForBooking } from "@/lib/rebookReminder";
import { businessDateStr } from "@/lib/business-time";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366 * 3;

const BOOKING_SELECT = {
  id: true,
  customerName: true,
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
} as const;

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

  const prev = previousPeriod(from, to);
  const today = businessDateStr();
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const lastYearToday = format(subYears(parse(today, "yyyy-MM-dd", new Date()), 1), "yyyy-MM-dd");
  const lastYearStart = `${lastYearToday.slice(0, 4)}-01-01`;
  const historyEnd = to > today ? to : today;
  const perfYear = Number(to.slice(0, 4));

  const [
    inRange,
    inPrevious,
    confirmedHistory,
    upcoming,
    yearToDate,
    lastYearToDate,
    firstBooking,
    perfRows,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: { date: { gte: from, lte: to }, ...byTechnician },
      select: BOOKING_SELECT,
    }),
    prisma.booking.findMany({
      where: { date: { gte: prev.from, lte: prev.to }, ...byTechnician },
      select: BOOKING_SELECT,
    }),
    prisma.booking.findMany({
      where: { status: "confirmed", date: { lte: historyEnd } },
      select: { date: true, customerEmail: true, customerPhone: true, technicianId: true },
      orderBy: { date: "asc" },
    }),
    prisma.booking.aggregate({
      where: { status: "confirmed", date: { gte: today }, ...byTechnician },
      _count: true,
      _sum: { servicePrice: true },
    }),
    prisma.booking.aggregate({
      where: { status: "confirmed", date: { gte: yearStart, lte: today }, ...byTechnician },
      _sum: { servicePrice: true },
    }),
    prisma.booking.aggregate({
      where: { status: "confirmed", date: { gte: lastYearStart, lte: lastYearToday }, ...byTechnician },
      _sum: { servicePrice: true },
    }),
    prisma.booking.findFirst({ orderBy: { date: "asc" }, select: { date: true } }),
    prisma.booking.findMany({
      where: {
        status: "confirmed",
        date: { gte: `${perfYear - 1}-01-01`, lte: `${perfYear}-12-31` < today ? `${perfYear}-12-31` : today },
        ...byTechnician,
      },
      select: { date: true, servicePrice: true },
    }),
  ]);

  const firstVisit = new Map<string, string>();
  const allCustomers = new Set<string>();
  for (const b of confirmedHistory) {
    const key = contactKeyForBooking(b);
    if (!key) continue;
    if (!firstVisit.has(key)) firstVisit.set(key, b.date);
    if (b.date <= today && (!technicianId || b.technicianId === technicianId)) allCustomers.add(key);
  }

  const toStats = (rows: typeof inRange): StatsBooking[] =>
    rows.map((b) => ({ ...b, serviceName: b.service.name, technicianName: b.technician.name }));
  const stats = computeDashboardStats(toStats(inRange), contactKeyForBooking, firstVisit);
  const previous = computeDashboardStats(toStats(inPrevious), contactKeyForBooking, firstVisit);

  return NextResponse.json({
    from,
    to,
    ...stats,
    performance: yearOnYear(perfRows, perfYear),
    previous: {
      from: prev.from,
      to: prev.to,
      revenue: previous.revenue,
      confirmed: previous.confirmed,
      clients: previous.newCustomers + previous.returningCustomers,
    },
    glance: {
      upcomingCount: upcoming._count,
      upcomingValue: Math.round((upcoming._sum.servicePrice ?? 0) * 100) / 100,
      yearToDate: Math.round((yearToDate._sum.servicePrice ?? 0) * 100) / 100,
      lastYearToDate: Math.round((lastYearToDate._sum.servicePrice ?? 0) * 100) / 100,
      totalCustomers: allCustomers.size,
      firstYear: Number((firstBooking?.date ?? today).slice(0, 4)),
    },
  });
}
