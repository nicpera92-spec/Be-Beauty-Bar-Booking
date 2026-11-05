import { NextRequest, NextResponse } from "next/server";
import { listPortalBookings, verifyPortalSession } from "@/lib/customerPortal";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const contact = await verifyPortalSession(auth?.startsWith("Bearer ") ? auth.slice(7) : null);
  if (!contact) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const bookings = await listPortalBookings(contact);
  return NextResponse.json({ bookings }, { headers: { "Cache-Control": "no-store" } });
}
