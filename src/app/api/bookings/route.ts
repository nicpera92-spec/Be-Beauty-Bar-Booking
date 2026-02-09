import { NextRequest, NextResponse } from "next/server";
import { addDays, isBefore, parse, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/auth";
import { blockOverlapsBooking } from "@/lib/blockOverlap";
import { sendBookingCreatedEmails } from "@/lib/email";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { service: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json(booking);
  }

  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    include: { service: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(bookings);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      serviceId,
      customerName,
      customerEmail,
      customerPhone,
      date,
      startTime,
      endTime,
      depositAmount,
      notes,
      notifyByEmail,
      notifyBySMS,
    } = body;

    if (
      !serviceId ||
      !customerName ||
      !date ||
      !startTime ||
      !endTime ||
      depositAmount == null
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Input length limits to prevent abuse and DoS
    const MAX_NAME = 200;
    const MAX_EMAIL = 254;
    const MAX_PHONE = 30;
    const MAX_NOTES = 2000;
    if (typeof customerName === "string" && customerName.length > MAX_NAME) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }
    if (typeof customerEmail === "string" && customerEmail.length > MAX_EMAIL) {
      return NextResponse.json({ error: "Email is too long" }, { status: 400 });
    }
    if (typeof customerPhone === "string" && customerPhone.length > MAX_PHONE) {
      return NextResponse.json({ error: "Phone number is too long" }, { status: 400 });
    }
    if (typeof notes === "string" && notes.length > MAX_NOTES) {
      return NextResponse.json({ error: "Notes are too long" }, { status: 400 });
    }

    // Validate: at least one contact method
    if (!customerEmail?.trim() && !customerPhone?.trim()) {
      return NextResponse.json(
        { error: "Please provide either an email address or phone number (or both)." },
        { status: 400 }
      );
    }

    // Validate: at least one notification method
    const wantsEmail = notifyByEmail === true;
    const wantsSMS = notifyBySMS === true;
    if (!wantsEmail && !wantsSMS) {
      return NextResponse.json(
        { error: "Please select at least one notification method (email or SMS)." },
        { status: 400 }
      );
    }

    // Validate: if email notifications selected, email must be provided
    if (wantsEmail && !customerEmail?.trim()) {
      return NextResponse.json(
        { error: "Email address is required if you want email notifications." },
        { status: 400 }
      );
    }

    // Validate: if SMS notifications selected, phone must be provided
    if (wantsSMS && !customerPhone?.trim()) {
      return NextResponse.json(
        { error: "Phone number is required if you want SMS notifications." },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Validate time format (HH:mm)
    const timeRegex = /^\d{1,2}:\d{2}$/;
    if (typeof startTime !== "string" || !timeRegex.test(startTime) || typeof endTime !== "string" || !timeRegex.test(endTime)) {
      return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof date !== "string" || !dateRegex.test(date)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    const minBookableDate = addDays(startOfDay(new Date()), 1);
    const bookingDay = parse(date, "yyyy-MM-dd", new Date());
    if (isNaN(bookingDay.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (isBefore(bookingDay, minBookableDate)) {
      return NextResponse.json(
        { error: "Bookings must be at least one day in advance. Please choose tomorrow or later." },
        { status: 400 }
      );
    }

    const deposit = Number(depositAmount);
    if (deposit > service.price) {
      return NextResponse.json(
        { error: "Deposit cannot exceed service price" },
        { status: 400 }
      );
    }

    const [existing, blocks] = await Promise.all([
      prisma.booking.findMany({
        where: { date, status: { not: "cancelled" } },
        select: { startTime: true, endTime: true },
      }),
      prisma.availabilityBlock.findMany({
        where: { startDate: { lte: date }, endDate: { gte: date } },
      }),
    ]);

    const overlapsBooking = existing.some((b) => {
      const s1 = startTime;
      const e1 = endTime;
      const s2 = b.startTime;
      const e2 = b.endTime;
      return s1 < e2 && e1 > s2;
    });
    if (overlapsBooking) {
      return NextResponse.json(
        { error: "This time slot is no longer available. Please choose another." },
        { status: 409 }
      );
    }

    const overlapsBlock = blocks.some((b) =>
      blockOverlapsBooking(b.startDate, b.startTime, b.endDate, b.endTime, date, startTime, endTime)
    );
    if (overlapsBlock) {
      return NextResponse.json(
        { error: "This time slot is no longer available. Please choose another." },
        { status: 409 }
      );
    }

    const booking = await prisma.booking.create({
      data: {
        serviceId,
        customerName,
        customerEmail: customerEmail?.trim() || null,
        customerPhone: customerPhone?.trim() || null,
        date,
        startTime,
        endTime,
        servicePrice: service.price,
        depositAmount: deposit,
        notes: notes ?? "",
        status: "pending_deposit",
        notifyByEmail: wantsEmail,
        notifyBySMS: wantsSMS,
      },
      include: { service: true },
    });

    const emailResult = await sendBookingCreatedEmails(booking.id);
    if (!emailResult.ok) {
      console.error("Booking-created emails failed:", emailResult.error);
    }

    return NextResponse.json(booking);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
