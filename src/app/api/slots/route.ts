import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parse } from "date-fns";
import { getSlotsForDay } from "@/lib/slotUtils";
import { getMaxConcurrentForCategory, getCategoryExclusionPairs } from "@/lib/bookingAvailability";
import { hasWaitlistSameDayBookingAccess } from "@/lib/waitlist-booking-token";
import { isBeforeMinBookableDate } from "@/lib/business-time";
import { resolveHoursForDate } from "@/lib/workingHours";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const technicianId = searchParams.get("technicianId");

  if (!date || !serviceId || !technicianId) {
    return NextResponse.json(
      { error: "date, serviceId, and technicianId required" },
      { status: 400 }
    );
  }

  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { technician: { select: { id: true, active: true, workingHours: true } } },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    if (service.technicianId !== technicianId) {
      return NextResponse.json(
        { error: "This service does not belong to the selected technician" },
        { status: 400 }
      );
    }
    if (!service.technician?.active) {
      return NextResponse.json({ error: "Technician is not available" }, { status: 400 });
    }

    const day = parse(date, "yyyy-MM-dd", new Date());
    const waitlistToken = searchParams.get("wl");
    const sameDayWaitlistAccess = await hasWaitlistSameDayBookingAccess(waitlistToken, {
      date,
      serviceId,
      technicianId,
    });
    if (!sameDayWaitlistAccess && isBeforeMinBookableDate(date)) {
      return NextResponse.json({ slots: [] });
    }

    const [settings, dayBookings, blocks, maxConcurrent, exclusionPairs] = await Promise.all([
      prisma.businessSettings.findUnique({ where: { id: "default" } }),
      prisma.booking.findMany({
        where: { date, status: { not: "cancelled" } },
        select: {
          technicianId: true,
          startTime: true,
          endTime: true,
          service: { select: { category: true } },
        },
      }),
      prisma.availabilityBlock.findMany({
        where: {
          startDate: { lte: date },
          endDate: { gte: date },
          technicianId,
        },
      }),
      getMaxConcurrentForCategory(service.category),
      getCategoryExclusionPairs(),
    ]);

    const s = settings ?? { openTime: "09:00", closeTime: "17:00", slotInterval: 30 };
    const dayHours = resolveHoursForDate(
      date,
      service.technician.workingHours,
      s.openTime,
      s.closeTime
    );
    if (dayHours.isOff) {
      return NextResponse.json({ slots: [] });
    }

    const now = new Date();

    const technicianBookings = dayBookings
      .filter((b) => b.technicianId === technicianId)
      .map((b) => ({ startTime: b.startTime, endTime: b.endTime }));

    const categoryBookings = dayBookings.map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      service: { category: b.service.category },
    }));

    const slots = getSlotsForDay(
      date,
      day,
      dayHours.openTime,
      dayHours.closeTime,
      s.slotInterval,
      service.durationMin,
      [],
      blocks,
      now,
      {
        technicianBookings,
        categoryBookings,
        serviceCategory: service.category,
        maxConcurrentInCategory: maxConcurrent,
        exclusionPairs,
      }
    );

    return NextResponse.json({ slots });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}
