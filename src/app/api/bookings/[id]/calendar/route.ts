import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingCalendarEvent, buildIcs } from "@/lib/calendarInvite";
import { bookingSiteUrl } from "@/lib/notificationTemplates";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [booking, settings] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
        rescheduleCount: true,
        service: { select: { name: true } },
        technician: { select: { name: true } },
      },
    }),
    prisma.businessSettings.findUnique({
      where: { id: "default" },
      select: { businessName: true, businessAddress: true },
    }),
  ]);
  if (!booking || booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const event = bookingCalendarEvent(
    booking,
    settings?.businessName ?? "Be Beauty Bar",
    bookingSiteUrl(`/booking/${booking.id}`),
    settings?.businessAddress
  );
  return new NextResponse(buildIcs(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="appointment.ics"',
      "Cache-Control": "no-store",
    },
  });
}
