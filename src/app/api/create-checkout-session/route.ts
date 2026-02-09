import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

async function getStripeInstance(): Promise<Stripe | null> {
  // First, try to get from database
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { stripeSecretKey: true },
  });
  
  const secretKey = settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    return null;
  }
  
  return new Stripe(secretKey);
}

export async function POST(req: NextRequest) {
  const stripe = await getStripeInstance();
  
  if (!stripe) {
    return NextResponse.json(
      { error: "Pay by card is not configured. Add your Stripe Secret Key in Admin → Business settings → Stripe Payment Setup." },
      { status: 503 }
    );
  }

  try {
    const { bookingId, type = "deposit" } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }
    if (type !== "deposit" && type !== "balance") {
      return NextResponse.json({ error: "type must be deposit or balance" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    let amountPence: number;
    let productName: string;
    let productDesc: string;

    if (type === "deposit") {
      if (booking.status !== "pending_deposit") {
        return NextResponse.json(
          { error: "Booking is not awaiting deposit" },
          { status: 400 }
        );
      }
      amountPence = Math.round(booking.depositAmount * 100);
      
      // Get SMS fee from settings to show breakdown
      const settings = await prisma.businessSettings.findUnique({
        where: { id: "default" },
        select: { smsNotificationFee: true },
      });
      const smsFee = settings?.smsNotificationFee ?? 0.05;
      const baseDeposit = booking.depositAmount - (booking.notifyBySMS ? smsFee : 0);
      
      productName = `Deposit: ${booking.service.name}`;
      if (booking.notifyBySMS) {
        productDesc = `Booking ${booking.date} ${booking.startTime}–${booking.endTime} (includes ${formatCurrency(baseDeposit)} deposit + ${formatCurrency(smsFee)} SMS fee)`;
      } else {
        productDesc = `Booking ${booking.date} ${booking.startTime}–${booking.endTime}`;
      }
    } else {
      if (booking.status !== "confirmed") {
        return NextResponse.json(
          { error: "Pay deposit first to confirm your booking" },
          { status: 400 }
        );
      }
      if (booking.balancePaidOnline) {
        return NextResponse.json(
          { error: "Remaining balance already paid" },
          { status: 400 }
        );
      }
      // Calculate remaining balance (service price - base deposit, excluding SMS fee)
      const settings = await prisma.businessSettings.findUnique({
        where: { id: "default" },
        select: { smsNotificationFee: true },
      });
      const smsFee = settings?.smsNotificationFee ?? 0.05;
      const baseDeposit = booking.depositAmount - (booking.notifyBySMS ? smsFee : 0);
      const remaining = booking.servicePrice - baseDeposit;
      if (remaining <= 0) {
        return NextResponse.json(
          { error: "No remaining balance to pay" },
          { status: 400 }
        );
      }
      amountPence = Math.round(remaining * 100);
      productName = `Remaining: ${booking.service.name}`;
      productDesc = `Booking ${booking.date} ${booking.startTime}–${booking.endTime} · balance`;
    }

    if (amountPence < 50) {
      return NextResponse.json(
        { error: "Minimum Stripe charge is £0.50" },
        { status: 400 }
      );
    }

    const createParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card", "paypal"],
      metadata: { bookingId, type },
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: productName,
              description: productDesc,
            },
            unit_amount: amountPence,
          },
          quantity: 1,
        },
      ],
      success_url: type === "deposit"
        ? `${baseUrl}/booking/deposit-confirmed?bookingId=${bookingId}`
        : `${baseUrl}/booking/${bookingId}?paid=1`,
      cancel_url: `${baseUrl}/booking/${bookingId}`,
    };
    if (booking.customerEmail) {
      createParams.customer_email = booking.customerEmail;
    }
    const session = await stripe.checkout.sessions.create(createParams);

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("create-checkout-session:", e);
    return NextResponse.json(
      { error: "Failed to create payment link" },
      { status: 500 }
    );
  }
}
