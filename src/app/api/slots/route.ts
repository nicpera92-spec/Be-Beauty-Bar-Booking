import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlotsForDay } from "@/lib/slotAvailability";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const technicianId = searchParams.get("technicianId");

  if (!date || !serviceId || !technicianId) {
    return NextResponse.json(
      { error: "date, serviceId, and technicianId required" },
      { status: 400 }
    );
  }

  try {
    const result = await getAvailableSlotsForDay({
      date,
      serviceId,
      technicianId,
      waitlistToken: searchParams.get("wl"),
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ slots: result.slots });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}
