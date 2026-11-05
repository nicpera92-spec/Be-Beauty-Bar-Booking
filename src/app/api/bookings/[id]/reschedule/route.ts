import { NextRequest, NextResponse } from "next/server";
import { verifyCancelSignature } from "@/lib/customerCancellation";
import {
  getRescheduleAvailability,
  getRescheduleSlots,
  rescheduleBookingByCustomer,
} from "@/lib/customerReschedule";

/**
 * Without ?date=: which days have free times (calendar). With ?date=: the free times that day.
 * Uses the same signed link as cancellation.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const signature = req.nextUrl.searchParams.get("s");
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!verifyCancelSignature(params.id, signature)) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }
  if (!date) {
    const calendar = await getRescheduleAvailability(params.id);
    if (!calendar.ok) return NextResponse.json({ error: calendar.error }, { status: 409 });
    return NextResponse.json(calendar);
  }
  const result = await getRescheduleSlots(params.id, date);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ slots: result.slots });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const signature = typeof body?.s === "string" ? body.s : null;
  if (!verifyCancelSignature(params.id, signature)) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }
  const date = typeof body?.date === "string" ? body.date : "";
  const startTime = typeof body?.startTime === "string" ? body.startTime : "";
  if (!date || !startTime) {
    return NextResponse.json({ error: "Please choose a date and time." }, { status: 400 });
  }

  const result = await rescheduleBookingByCustomer(params.id, date, startTime);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, reason: result.reason }, { status: 409 });
  }
  return NextResponse.json({ ok: true, booking: result.booking, previous: result.previous });
}
