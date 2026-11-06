import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/auth";
import { setCustomerReviewed } from "@/lib/reviewTracking";

/** { bookingId, reviewed } — mark that booking's customer as having left a Google review (or undo). */
export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (typeof body?.bookingId !== "string") {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }
  const booking = await prisma.booking.findUnique({
    where: { id: body.bookingId },
    select: { customerEmail: true, customerPhone: true, technicianId: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (admin.role === "technician" && admin.technicianId !== booking.technicianId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (!booking.customerEmail && !booking.customerPhone) {
    return NextResponse.json({ error: "This booking has no email or phone to remember." }, { status: 400 });
  }
  await setCustomerReviewed(booking, body.reviewed !== false, "owner");
  return NextResponse.json({ ok: true });
}
