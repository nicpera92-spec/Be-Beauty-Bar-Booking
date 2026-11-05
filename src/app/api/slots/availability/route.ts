import { NextRequest, NextResponse } from "next/server";
import { getAvailabilityForRange } from "@/lib/slotAvailability";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId");
  const technicianId = searchParams.get("technicianId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!serviceId || !technicianId || !from || !to) {
    return NextResponse.json(
      { error: "serviceId, technicianId, from, and to required" },
      { status: 400 }
    );
  }

  try {
    const result = await getAvailabilityForRange({
      serviceId,
      technicianId,
      from,
      to,
      waitlistToken: searchParams.get("wl"),
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ availability: result.availability });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
