import { NextRequest, NextResponse } from "next/server";
import { hasWaitlistSameDayBookingAccess } from "@/lib/waitlist-booking-token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("wl");
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const technicianId = searchParams.get("technicianId");

  if (!token || !date || !serviceId || !technicianId) {
    return NextResponse.json({ ok: false });
  }

  const ok = await hasWaitlistSameDayBookingAccess(token, { date, serviceId, technicianId });
  return NextResponse.json({ ok, date: ok ? date : null });
}
