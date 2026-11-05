import { NextResponse } from "next/server";
import { getCachedPublicSettings } from "@/lib/cachedSettings";
import { googleMapsUrl } from "@/lib/calendarInvite";

export const dynamic = "force-dynamic";

/** Short SMS-friendly link (bbbar.co.uk/directions) that opens Google Maps on the salon. */
export async function GET() {
  const settings = await getCachedPublicSettings().catch(() => null);
  const businessName = (settings?.businessName as string | undefined) ?? "Be Beauty Bar";
  const address = settings?.businessAddress as string | null | undefined;
  return NextResponse.redirect(googleMapsUrl(businessName, address), 307);
}
