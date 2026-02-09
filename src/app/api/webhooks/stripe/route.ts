import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmationEmails } from "@/lib/email";

async function getStripeConfig(): Promise<{ stripe: Stripe | null; webhookSecret: string | null }> {
  // First, try to get from database
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { stripeSecretKey: true, stripeWebhookSecret: true },
  });
  
  const secretKey = settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  const webhookSecret = settings?.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || null;
  
  if (!secretKey) {
    return { stripe: null, webhookSecret: null };
  }
  
  return { stripe: new Stripe(secretKey), webhookSecret };
}

export async function POST(req: NextRequest) {
  const { stripe, webhookSecret } = await getStripeConfig();
  
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook not configured. Add your Stripe keys in Admin → Business settings → Stripe Payment Setup." },
      { status: 503 }
    );
  }

  try {
    const raw = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, webhookSecret!);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    const type = (session.metadata?.type as string) || "deposit";
    if (!bookingId) {
      console.error("Stripe webhook: no bookingId in metadata");
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (type === "balance") {
      if (booking.balancePaidOnline) {
        return NextResponse.json({ received: true });
      }
      const balancePi = (session.payment_intent as string) || null;
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          balancePaidOnline: true,
          ...(balancePi && { stripeBalancePaymentIntentId: balancePi }),
        },
      });
      return NextResponse.json({ received: true });
    }

    if (booking.status === "confirmed") {
      return NextResponse.json({ received: true });
    }

    const depositPi = (session.payment_intent as string) || null;
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "confirmed",
        ...(depositPi && { stripeDepositPaymentIntentId: depositPi }),
      },
    });

    const emailResult = await sendBookingConfirmationEmails(bookingId);
    if (!emailResult.ok) {
      console.error("Confirmation emails failed after deposit:", emailResult.error);
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Stripe webhook error:", e);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
