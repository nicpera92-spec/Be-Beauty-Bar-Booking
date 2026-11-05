import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  cancelBookingByCustomer,
  describeRefundForCustomer,
  getCustomerCancelState,
  verifyCancelSignature,
} from "@/lib/customerCancellation";
import { DEFAULT_CANCELLATION_REFUND_HOURS, normalizeRefundHours } from "@/lib/cancellationPolicy";

async function loadBookingSummary(id: string) {
  const [booking, settings] = await Promise.all([
    prisma.booking.findUnique({
      where: { id },
      include: { service: true, technician: true },
    }),
    prisma.businessSettings.findUnique({
      where: { id: "default" },
      select: { businessName: true, instagramHandle: true, cancellationRefundHours: true },
    }),
  ]);
  return {
    booking,
    businessName: settings?.businessName ?? "Be Beauty Bar",
    instagramHandle: settings?.instagramHandle ?? null,
    refundHours: normalizeRefundHours(
      settings?.cancellationRefundHours ?? DEFAULT_CANCELLATION_REFUND_HOURS
    ),
  };
}

function summarize(booking: NonNullable<Awaited<ReturnType<typeof loadBookingSummary>>["booking"]>) {
  return {
    customerName: booking.customerName,
    serviceName: booking.service.name,
    technicianName: booking.technician?.name ?? null,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    depositAmount: booking.depositAmount,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const signature = req.nextUrl.searchParams.get("s");
  if (!verifyCancelSignature(params.id, signature)) {
    return NextResponse.json({ state: "invalid" }, { status: 404 });
  }

  const { booking, businessName, instagramHandle, refundHours } = await loadBookingSummary(params.id);
  if (!booking) {
    return NextResponse.json({ state: "invalid" }, { status: 404 });
  }

  return NextResponse.json({
    state: getCustomerCancelState(booking, new Date(), refundHours),
    booking: summarize(booking),
    refundHours,
    businessName,
    instagramHandle,
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const signature = typeof body?.s === "string" ? body.s : null;
  if (!verifyCancelSignature(params.id, signature)) {
    return NextResponse.json({ state: "invalid" }, { status: 404 });
  }

  const result = await cancelBookingByCustomer(params.id);
  if (!result.ok) {
    const state = result.state === "not_found" ? "invalid" : result.state;
    return NextResponse.json({ state }, { status: state === "invalid" ? 404 : 409 });
  }

  return NextResponse.json({
    state: "cancelled",
    refundDetails: describeRefundForCustomer(result.refund),
  });
}
