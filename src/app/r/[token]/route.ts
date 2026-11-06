import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setCustomerReviewed, verifyReviewToken } from "@/lib/reviewTracking";

export const dynamic = "force-dynamic";

/** Review request link: remembers the customer opened it (so they're not asked again), then goes to Google. */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { googleReviewUrl: true },
  });
  const googleUrl = settings?.googleReviewUrl?.trim() || new URL("/", req.url).toString();

  const bookingId = verifyReviewToken(params.token);
  if (bookingId) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { customerEmail: true, customerPhone: true },
      });
      if (booking) await setCustomerReviewed(booking, true, "link");
    } catch (e) {
      console.error("review link tracking:", e);
    }
  }
  return NextResponse.redirect(googleUrl, 302);
}
