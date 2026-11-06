import { NextRequest, NextResponse } from "next/server";
import { parse } from "date-fns";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/auth";
import { blockOverlapsBooking } from "@/lib/blockOverlap";
import { sendBookingCreatedEmails, sendBookingConfirmationEmails } from "@/lib/email";
import { isBookingSlotAvailable } from "@/lib/bookingAvailability";
import { hasWaitlistSameDayBookingAccess } from "@/lib/waitlist-booking-token";
import { isBeforeMinBookableDate } from "@/lib/business-time";
import { loadReviewedLookup } from "@/lib/reviewTracking";
import {
  attachCertificateItemToBooking,
  claimCertificateItem,
  claimVoucherForDeposit,
  lookupVoucher,
  recordVoucherTransaction,
  releaseCertificateItem,
} from "@/lib/giftVouchers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { service: true, technician: true },
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
    where:
      admin.role === "technician" && admin.technicianId
        ? { technicianId: admin.technicianId }
        : undefined,
    include: { service: true, technician: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  const reviewed = await loadReviewedLookup();
  return NextResponse.json(bookings.map((b) => ({ ...b, customerReviewed: reviewed(b) })));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      serviceId,
      technicianId,
      customerName,
      customerEmail,
      customerPhone,
      date,
      startTime,
      endTime,
      notes,
      notifyByEmail,
      notifyBySMS,
      waitlistToken,
      wl,
      voucherCode,
    } = body;

    if (
      !serviceId ||
      !technicianId ||
      !customerName ||
      !date ||
      !startTime ||
      !endTime
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
      include: { technician: true },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    if (service.technicianId !== String(technicianId)) {
      return NextResponse.json(
        { error: "This service does not belong to the selected technician" },
        { status: 400 }
      );
    }
    if (!service.technician?.active) {
      return NextResponse.json({ error: "Technician is not available" }, { status: 400 });
    }

    const servicePrice = service.price;
    const validTechnicianId = service.technicianId;

    const settings = await prisma.businessSettings.findUnique({
      where: { id: "default" },
    });
    const smsFee = settings?.smsNotificationFee ?? 0.05;
    // When a service doesn't require a deposit, nothing is charged up front and
    // the booking is confirmed instantly (no deposit and no SMS fee collected).
    const requiresDeposit = service.requiresDeposit;
    const deposit = requiresDeposit ? service.depositAmount + (wantsSMS ? smsFee : 0) : 0;

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
    const bookingDay = parse(date, "yyyy-MM-dd", new Date());
    if (isNaN(bookingDay.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const sameDayWaitlistAccess = await hasWaitlistSameDayBookingAccess(
      typeof waitlistToken === "string" ? waitlistToken : typeof wl === "string" ? wl : null,
      { date, serviceId, technicianId }
    );
    if (!sameDayWaitlistAccess && isBeforeMinBookableDate(date)) {
      return NextResponse.json(
        { error: "Bookings must be at least one day in advance. Please choose tomorrow or later." },
        { status: 400 }
      );
    }

    if (deposit > servicePrice) {
      return NextResponse.json(
        { error: "Deposit cannot exceed service price" },
        { status: 400 }
      );
    }

    const [blocks, slotCheck] = await Promise.all([
      prisma.availabilityBlock.findMany({
        where: {
          startDate: { lte: date },
          endDate: { gte: date },
          technicianId: validTechnicianId,
        },
      }),
      isBookingSlotAvailable({
        date,
        startTime,
        endTime,
        technicianId: validTechnicianId,
        serviceCategory: service.category,
      }),
    ]);

    if (!slotCheck.ok) {
      return NextResponse.json({ error: slotCheck.reason }, { status: 409 });
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

    const code = typeof voucherCode === "string" && voucherCode.trim() ? voucherCode : null;
    const lookup = code ? await lookupVoucher(code) : null;
    if (lookup && !lookup.ok) {
      return NextResponse.json({ error: lookup.error }, { status: 400 });
    }

    // Gift certificate: the treatment is already paid in full, so no deposit or SMS fee.
    let certificate: { voucherId: string; itemId: string } | null = null;
    if (lookup?.ok && lookup.kind === "certificate") {
      const claimed = await claimCertificateItem(code, service);
      if (!claimed.ok) {
        return NextResponse.json({ error: claimed.error }, { status: 400 });
      }
      certificate = { voucherId: claimed.voucherId, itemId: claimed.itemId };
    }

    let voucher: { voucherId: string; amount: number } | null = null;
    // Pence a voucher couldn't cover (below Stripe's minimum) are paid at the salon instead.
    let onlineDeposit = certificate ? 0 : deposit;
    if (lookup?.ok && lookup.kind === "credit" && requiresDeposit && deposit > 0) {
      const claimed = await claimVoucherForDeposit(code, deposit);
      if (!claimed.ok) {
        return NextResponse.json({ error: claimed.error }, { status: 400 });
      }
      voucher = { voucherId: claimed.voucherId, amount: claimed.amount };
      onlineDeposit = Math.round((deposit - claimed.salon) * 100) / 100;
    }
    const depositDueByCard = onlineDeposit - (voucher?.amount ?? 0);
    const confirmedNow = !requiresDeposit || Boolean(certificate) || depositDueByCard <= 0.001;

    let booking;
    try {
      booking = await prisma.booking.create({
        data: {
          serviceId,
          technicianId: validTechnicianId,
          customerName,
          customerEmail: customerEmail?.trim() || null,
          customerPhone: customerPhone?.trim() || null,
          date,
          startTime,
          endTime,
          servicePrice,
          depositAmount: onlineDeposit,
          notes: notes ?? "",
          status: confirmedNow ? "confirmed" : "pending_deposit",
          notifyByEmail: wantsEmail,
          notifyBySMS: wantsSMS,
          ...(voucher && { voucherId: voucher.voucherId, voucherAmount: voucher.amount }),
          ...(certificate && { voucherId: certificate.voucherId, certificateItemId: certificate.itemId }),
        },
        include: { service: true, technician: true },
      });
    } catch (e) {
      if (voucher) {
        await prisma.giftVoucher.update({
          where: { id: voucher.voucherId },
          data: { balance: { increment: voucher.amount } },
        });
      }
      if (certificate) await releaseCertificateItem(certificate.itemId);
      throw e;
    }
    if (voucher) {
      await recordVoucherTransaction(voucher.voucherId, -voucher.amount, "Deposit for booking", booking.id);
    }
    if (certificate) {
      await attachCertificateItemToBooking(certificate.voucherId, certificate.itemId, booking);
    }

    // Confirmed straight away (no deposit, or a voucher covered it) → send the
    // confirmation email instead of the "pay your deposit" email.
    const emailResult = confirmedNow
      ? await sendBookingConfirmationEmails(booking.id)
      : await sendBookingCreatedEmails(booking.id);
    if (!emailResult.ok) {
      console.error("Booking emails failed:", emailResult.error);
    }

    const { removeWaitlistEntriesAfterBooking } = await import("@/lib/waitlist");
    await removeWaitlistEntriesAfterBooking({
      serviceId: booking.serviceId,
      technicianId: booking.technicianId,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      date: booking.date,
    });

    return NextResponse.json(booking);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
