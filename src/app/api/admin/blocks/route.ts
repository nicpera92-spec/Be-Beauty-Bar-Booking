import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/auth";
import { blockOverlapsBooking } from "@/lib/blockOverlap";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // yyyy-MM-dd
  const to = searchParams.get("to"); // yyyy-MM-dd
  const technicianFilter = searchParams.get("technicianId"); // master only: "all" or a technician id

  const where: {
    endDate?: { gte?: string };
    startDate?: { lte?: string };
    technicianId?: string;
  } = {};

  if (admin.role === "master") {
    // Owner can view everyone's time off or filter to one technician.
    if (technicianFilter && technicianFilter !== "all") {
      where.technicianId = technicianFilter;
    }
  } else {
    // Time off is personal to each technician.
    if (!admin.technicianId) {
      return NextResponse.json([]);
    }
    where.technicianId = admin.technicianId;
  }

  if (from && to) {
    where.endDate = { gte: from };
    where.startDate = { lte: to };
  } else if (from) {
    where.endDate = { gte: from };
  } else if (to) {
    where.startDate = { lte: to };
  }

  const blocks = await prisma.availabilityBlock.findMany({
    where,
    orderBy: [{ startDate: "asc" }, { startTime: "asc" }],
    include: {
      technician: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(blocks);
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { startDate, startTime, endDate, endTime } = body;

  if (
    !startDate ||
    !startTime ||
    !endDate ||
    !endTime ||
    typeof startDate !== "string" ||
    typeof startTime !== "string" ||
    typeof endDate !== "string" ||
    typeof endTime !== "string"
  ) {
    return NextResponse.json(
      { error: "startDate, startTime, endDate, endTime (yyyy-MM-dd, HH:mm) required" },
      { status: 400 }
    );
  }

  const startDt = new Date(`${startDate}T${startTime}`);
  const endDt = new Date(`${endDate}T${endTime}`);
  if (isNaN(startDt.getTime()) || isNaN(endDt.getTime()) || endDt <= startDt) {
    return NextResponse.json(
      { error: "End date/time must be after start date/time" },
      { status: 400 }
    );
  }

  // Time off is personal: it only needs to be clear of this technician's own
  // bookings. Other technicians can still take bookings during this period.
  const ownerTechnicianId = admin.technicianId;
  if (!ownerTechnicianId) {
    return NextResponse.json(
      { error: "Your login has no technician profile, so time off cannot be added." },
      { status: 400 }
    );
  }

  const bookings = await prisma.booking.findMany({
    where: {
      status: { not: "cancelled" },
      technicianId: ownerTechnicianId,
    },
    select: { date: true, startTime: true, endTime: true },
  });

  const overlapping = bookings.some((b) =>
    blockOverlapsBooking(startDate, startTime, endDate, endTime, b.date, b.startTime, b.endTime)
  );
  if (overlapping) {
    return NextResponse.json(
      {
        error:
          "A customer is already booked during this period. Remove or move the booking first, then add time off.",
      },
      { status: 409 }
    );
  }

  const block = await prisma.availabilityBlock.create({
    data: { startDate, startTime, endDate, endTime, technicianId: ownerTechnicianId },
  });
  return NextResponse.json(block);
}
