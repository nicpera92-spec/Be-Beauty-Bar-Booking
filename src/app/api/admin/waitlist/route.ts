import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest, requireMaster } from "@/lib/auth";
import { findWaitlistBooking } from "@/lib/waitlist";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json({ error: "Only the owner can view the waiting list" }, { status: 403 });
  }

  const entries = await prisma.waitingListEntry.findMany({
    orderBy: [{ preferredDate: "asc" }, { createdAt: "asc" }],
    include: {
      service: { select: { name: true } },
      technician: { select: { name: true } },
    },
  });
  if (entries.length === 0) return NextResponse.json([]);

  const earliestSignup = entries.reduce(
    (min, e) => (e.createdAt < min ? e.createdAt : min),
    entries[0].createdAt
  );
  const bookings = await prisma.booking.findMany({
    where: {
      technicianId: { in: [...new Set(entries.map((e) => e.technicianId))] },
      createdAt: { gte: earliestSignup },
    },
    select: {
      id: true,
      serviceId: true,
      technicianId: true,
      customerEmail: true,
      customerPhone: true,
      date: true,
      startTime: true,
      status: true,
      createdAt: true,
      service: { select: { name: true } },
    },
  });

  return NextResponse.json(
    entries.map((entry) => {
      const booking = findWaitlistBooking(entry, bookings);
      return {
        ...entry,
        matchedBooking: booking
          ? {
              id: booking.id,
              date: booking.date,
              startTime: booking.startTime,
              status: booking.status,
              serviceName: booking.service.name,
              createdAt: booking.createdAt,
            }
          : null,
      };
    })
  );
}
