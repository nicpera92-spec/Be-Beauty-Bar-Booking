import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/auth";

async function getStripeInstance(): Promise<Stripe | null> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { stripeSecretKey: true },
  });
  const secretKey = settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = await getStripeInstance();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured. Add your Stripe Secret Key in Admin → Settings." },
      { status: 503 }
    );
  }

  try {
    const { bookingId, type } = await req.json();
    if (!bookingId || !type || (type !== "deposit" && type !== "balance")) {
      return NextResponse.json(
        { error: "Missing or invalid body: bookingId and type (deposit | balance) required." },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (type === "deposit") {
      if (!booking.stripeDepositPaymentIntentId) {
        return NextResponse.json(
          { error: "No Stripe payment found for this deposit (e.g. deposit was marked paid manually)." },
          { status: 400 }
        );
      }
      if (booking.depositRefundedAt) {
        return NextResponse.json(
          { error: "Deposit was already refunded." },
          { status: 400 }
        );
      }
      await stripe.refunds.create({
        payment_intent: booking.stripeDepositPaymentIntentId,
        reason: "requested_by_customer",
      });
      await prisma.booking.update({
        where: { id: bookingId },
        data: { depositRefundedAt: new Date() },
      });
      return NextResponse.json({ ok: true, message: "Deposit refunded." });
    }

    if (type === "balance") {
      if (!booking.stripeBalancePaymentIntentId) {
        return NextResponse.json(
          { error: "No Stripe payment found for the balance (e.g. balance was paid in person)." },
          { status: 400 }
        );
      }
      if (booking.balanceRefundedAt) {
        return NextResponse.json(
          { error: "Balance was already refunded." },
          { status: 400 }
        );
      }
      await stripe.refunds.create({
        payment_intent: booking.stripeBalancePaymentIntentId,
        reason: "requested_by_customer",
      });
      await prisma.booking.update({
        where: { id: bookingId },
        data: { balanceRefundedAt: new Date() },
      });
      return NextResponse.json({ ok: true, message: "Balance refunded." });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e: unknown) {
    const err = e as { type?: string; message?: string };
    if (err.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { error: err.message || "Stripe could not process the refund." },
        { status: 400 }
      );
    }
    console.error("Admin refund error:", e);
    return NextResponse.json(
      { error: "Refund failed. Check Stripe Dashboard or try again." },
      { status: 500 }
    );
  }
}
