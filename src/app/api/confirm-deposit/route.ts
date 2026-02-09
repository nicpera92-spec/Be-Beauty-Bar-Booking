import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmationEmails } from "@/lib/email";

async function getStripeInstance(): Promise<Stripe | null> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { stripeSecretKey: true },
  });
  const secretKey = settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

/**
 * Called when the customer returns from Stripe Checkout (deposit or balance).
 * Verifies the session with Stripe and, if paid, updates the booking.
 * This makes the booking move to "Confirmed" even if the webhook hasn't run yet.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId")?.trim();
  const sessionId = searchParams.get("session_id")?.trim();

  if (!bookingId || !sessionId) {
    return NextResponse.json(
      { error: "Missing bookingId or session_id" },
      { status: 400 }
    );
  }

  const stripe = await getStripeInstance();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed", paid: false },
        { status: 400 }
      );
    }
    const metaBookingId = session.metadata?.bookingId;
    const type = (session.metadata?.type as string) || "deposit";
    if (metaBookingId !== bookingId) {
      return NextResponse.json(
        { error: "Session does not match booking" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (type === "balance") {
      if (booking.balancePaidOnline) {
        return NextResponse.json({ ok: true, alreadyDone: true });
      }
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          balancePaidOnline: true,
          ...(paymentIntentId && { stripeBalancePaymentIntentId: paymentIntentId }),
        },
      });
      return NextResponse.json({ ok: true });
    }

    // type === "deposit"
    if (booking.status === "confirmed") {
      return NextResponse.json({ ok: true, alreadyDone: true });
    }
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "confirmed",
        ...(paymentIntentId && { stripeDepositPaymentIntentId: paymentIntentId }),
      },
    });

    sendBookingConfirmationEmails(bookingId).catch((e) =>
      console.error("Confirmation emails failed after confirm-deposit:", e)
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("confirm-deposit:", e);
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
