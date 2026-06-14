import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, format, parse, startOfDay, isBefore, isSameDay } from "date-fns";
import { getSlotsForDay } from "@/lib/slotUtils";
import { getMaxConcurrentForCategory } from "@/lib/bookingAvailability";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId");
  const technicianId = searchParams.get("technicianId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!serviceId || !technicianId || !from || !to) {
    return NextResponse.json(
      { error: "serviceId, technicianId, from, and to required" },
      { status: 400 }
    );
  }

  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { technician: { select: { active: true } } },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    if (service.technicianId !== technicianId) {
      return NextResponse.json({ error: "Service does not match technician" }, { status: 400 });
    }

    // If the technician is not bookable, no day has availability. This mirrors
    // /api/slots so the calendar can't show an open day with no times behind it.
    if (!service.technician?.active) {
      const fromDate = parse(from, "yyyy-MM-dd", new Date());
      const toDate = parse(to, "yyyy-MM-dd", new Date());
      const numDays =
        Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      const availability: Record<string, boolean> = {};
      for (let i = 0; i < numDays; i++) {
        availability[format(addDays(fromDate, i), "yyyy-MM-dd")] = false;
      }
      return NextResponse.json({ availability });
    }

    const [settings, bookings, blocks, maxConcurrent] = await Promise.all([
      prisma.businessSettings.findUnique({ where: { id: "default" } }),
      prisma.booking.findMany({
        where: { date: { gte: from, lte: to }, status: { not: "cancelled" } },
        select: {
          date: true,
          technicianId: true,
          startTime: true,
          endTime: true,
          service: { select: { category: true } },
        },
      }),
      prisma.availabilityBlock.findMany({
        where: {
          startDate: { lte: to },
          endDate: { gte: from },
          technicianId,
        },
      }),
      getMaxConcurrentForCategory(service.category),
    ]);

    const s = settings ?? { openTime: "09:00", closeTime: "17:00", slotInterval: 30 };
    const fromDate = parse(from, "yyyy-MM-dd", new Date());
    const toDate = parse(to, "yyyy-MM-dd", new Date());
    const now = new Date();
    // Match /api/slots: nothing is bookable today or earlier.
    const minBookableDate = addDays(startOfDay(now), 1);
    const numDays = Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const availability: Record<string, boolean> = {};

    for (let i = 0; i < numDays; i++) {
      const d = addDays(fromDate, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const day = parse(dateStr, "yyyy-MM-dd", new Date());

      if (isBefore(day, minBookableDate) || isSameDay(day, startOfDay(now))) {
        availability[dateStr] = false;
        continue;
      }

      const dayBookings = bookings.filter((b) => b.date === dateStr);
      const dayBlocks = blocks.filter((b) => b.startDate <= dateStr && b.endDate >= dateStr);

      const technicianBookings = dayBookings
        .filter((b) => b.technicianId === technicianId)
        .map((b) => ({ startTime: b.startTime, endTime: b.endTime }));

      const categoryBookings = dayBookings.map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
        service: { category: b.service.category },
      }));

      const slots = getSlotsForDay(
        dateStr,
        day,
        s.openTime,
        s.closeTime,
        s.slotInterval,
        service.durationMin,
        [],
        dayBlocks,
        now,
        {
          technicianBookings,
          categoryBookings,
          serviceCategory: service.category,
          maxConcurrentInCategory: maxConcurrent,
        }
      );

      availability[dateStr] = slots.length > 0;
    }

    return NextResponse.json({ availability });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
