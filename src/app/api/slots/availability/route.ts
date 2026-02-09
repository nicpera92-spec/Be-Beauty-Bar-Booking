import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, format, parse } from "date-fns";
import { getSlotsForDay } from "@/lib/slotUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!serviceId || !from || !to) {
    return NextResponse.json(
      { error: "serviceId, from, and to required" },
      { status: 400 }
    );
  }

  try {
    const [service, settings, bookings, blocks] = await Promise.all([
      prisma.service.findUnique({ where: { id: serviceId } }),
      prisma.businessSettings.findUnique({ where: { id: "default" } }),
      prisma.booking.findMany({
        where: { date: { gte: from, lte: to }, status: { not: "cancelled" } },
        select: { date: true, startTime: true, endTime: true },
      }),
      prisma.availabilityBlock.findMany({
        where: { startDate: { lte: to }, endDate: { gte: from } },
      }),
    ]);

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const s = settings ?? { openHour: 9, closeHour: 17, slotInterval: 30 };
    const fromDate = parse(from, "yyyy-MM-dd", new Date());
    const toDate = parse(to, "yyyy-MM-dd", new Date());
    const now = new Date();
    const numDays = Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const availability: Record<string, boolean> = {};

    for (let i = 0; i < numDays; i++) {
      const d = addDays(fromDate, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const day = parse(dateStr, "yyyy-MM-dd", new Date());
      const dayBookings = bookings.filter((b) => b.date === dateStr);
      const dayBlocks = blocks.filter((b) => b.startDate <= dateStr && b.endDate >= dateStr);

      const slots = getSlotsForDay(
        dateStr,
        day,
        s.openHour,
        s.closeHour,
        s.slotInterval,
        service.durationMin,
        dayBookings,
        dayBlocks,
        now
      );

      availability[dateStr] = slots.length > 0;
    }

    return NextResponse.json({ availability });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
