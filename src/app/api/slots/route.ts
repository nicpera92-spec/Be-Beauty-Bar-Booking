import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, parse, startOfDay, isBefore, isSameDay } from "date-fns";
import { getSlotsForDay } from "@/lib/slotUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!date || !serviceId) {
    return NextResponse.json({ error: "date and serviceId required" }, { status: 400 });
  }

  try {
    const [service, settings, existingBookings, blocks] = await Promise.all([
      prisma.service.findUnique({ where: { id: serviceId } }),
      prisma.businessSettings.findUnique({ where: { id: "default" } }),
      prisma.booking.findMany({
        where: { date, status: { not: "cancelled" } },
        select: { startTime: true, endTime: true },
      }),
      prisma.availabilityBlock.findMany({
        where: { startDate: { lte: date }, endDate: { gte: date } },
      }),
    ]);

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const day = parse(date, "yyyy-MM-dd", new Date());
    const minBookableDate = addDays(startOfDay(new Date()), 1);
    if (isBefore(day, minBookableDate) || isSameDay(day, startOfDay(new Date()))) {
      return NextResponse.json({ slots: [] });
    }

    const s = settings ?? { openTime: "09:00", closeTime: "17:00", slotInterval: 30 };
    const now = new Date();
    const slots = getSlotsForDay(
      date,
      day,
      s.openTime,
      s.closeTime,
      s.slotInterval,
      service.durationMin,
      existingBookings,
      blocks,
      now
    );

    return NextResponse.json({ slots });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}
