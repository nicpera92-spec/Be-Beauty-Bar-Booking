import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmationEmails, sendManualCancellationEmails } from "@/lib/email";
import { verifyAdminRequest } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  return NextResponse.json(booking);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json();
  const { status } = body;

  if (!status || !["pending_deposit", "confirmed", "cancelled"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Use: pending_deposit | confirmed | cancelled" },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: { status },
    include: { service: true },
  });

  if (status === "confirmed") {
    const r = await sendBookingConfirmationEmails(id);
    if (!r.ok) console.error("Failed to send confirmation emails:", r.error);
  }

  if (status === "cancelled") {
    const r = await sendManualCancellationEmails(id);
    if (!r.ok) console.error("Failed to send cancellation emails:", r.error);
  }

  return NextResponse.json(booking);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "cancelled") {
    return NextResponse.json(
      { error: "Only cancelled bookings can be removed" },
      { status: 400 }
    );
  }

  await prisma.booking.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
