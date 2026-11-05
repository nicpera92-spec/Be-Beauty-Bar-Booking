import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  VOUCHER_VALID_MONTHS,
  isValidVoucherAmount,
  normalizeVoucherCode,
  randomVoucherCodeFrom,
  voucherDepositSplit,
} from "@/lib/giftVoucherRules";

const baseUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");

async function getStripe(): Promise<Stripe | null> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { stripeSecretKey: true },
  });
  const key = settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

async function uniqueVoucherCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = randomVoucherCodeFrom(randomBytes(8));
    const exists = await prisma.giftVoucher.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique voucher code");
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type VoucherPurchaseInput = {
  amount: unknown;
  purchaserName: unknown;
  purchaserEmail: unknown;
  recipientName?: unknown;
  recipientEmail?: unknown;
  message?: unknown;
};

/** Creates an unpaid voucher and a Stripe Checkout page for it. */
export async function createVoucherCheckout(
  input: VoucherPurchaseInput
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!isValidVoucherAmount(input.amount)) {
    return { ok: false, error: "Please choose an amount between £10 and £500 (whole pounds)." };
  }
  const purchaserName = clean(input.purchaserName, 120);
  const purchaserEmail = clean(input.purchaserEmail, 254)?.toLowerCase() ?? null;
  const recipientEmail = clean(input.recipientEmail, 254)?.toLowerCase() ?? null;
  if (!purchaserName || !purchaserEmail || !EMAIL_RE.test(purchaserEmail)) {
    return { ok: false, error: "Please enter your name and a valid email address." };
  }
  if (recipientEmail && !EMAIL_RE.test(recipientEmail)) {
    return { ok: false, error: "Please check the recipient's email address." };
  }

  const stripe = await getStripe();
  if (!stripe) return { ok: false, error: "Online payments aren't set up yet. Please contact the salon." };

  const amount = Number(input.amount);
  const voucher = await prisma.giftVoucher.create({
    data: {
      code: await uniqueVoucherCode(),
      initialAmount: amount,
      balance: 0,
      purchaserName,
      purchaserEmail,
      recipientName: clean(input.recipientName, 120),
      recipientEmail,
      message: clean(input.message, 500),
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "paypal", "link"],
    metadata: { type: "voucher", voucherId: voucher.id },
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: `Gift voucher – £${amount}`,
            description: voucher.recipientName ? `For ${voucher.recipientName}` : "Be Beauty Bar gift voucher",
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl()}/gift-vouchers/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl()}/gift-vouchers`,
  });
  await prisma.giftVoucher.update({ where: { id: voucher.id }, data: { stripeSessionId: session.id } });
  if (!session.url) return { ok: false, error: "Could not start payment. Please try again." };
  return { ok: true, url: session.url };
}

/** Marks a paid voucher active (once) and emails the code. Safe to call from webhook and return page. */
export async function activateVoucher(voucherId: string, paymentIntentId: string | null): Promise<boolean> {
  const now = new Date();
  const voucher = await prisma.giftVoucher.findUnique({ where: { id: voucherId } });
  if (!voucher) return false;
  const claimed = await prisma.giftVoucher.updateMany({
    where: { id: voucherId, status: "pending_payment" },
    data: {
      status: "active",
      balance: voucher.initialAmount,
      paidAt: now,
      expiresAt: addMonths(now, VOUCHER_VALID_MONTHS),
      stripePaymentIntentId: paymentIntentId,
    },
  });
  if (claimed.count === 0) return false;
  await prisma.voucherTransaction.create({
    data: { voucherId, amount: voucher.initialAmount, note: "Bought online" },
  });
  const { sendGiftVoucherEmails } = await import("@/lib/email");
  const r = await sendGiftVoucherEmails(voucherId);
  if (!r.ok) console.error("Gift voucher emails failed:", r.error);
  return true;
}

/** Return page after Stripe: activates the voucher if paid and returns what to show. */
export async function confirmVoucherSession(sessionId: string): Promise<
  | { ok: true; code: string; amount: number; recipientName: string | null; recipientEmail: string | null; expiresAt: Date | null; purchaserEmail: string }
  | { ok: false; error: string }
> {
  const stripe = await getStripe();
  if (!stripe) return { ok: false, error: "Payments not configured" };
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const voucherId = session.metadata?.voucherId;
  if (session.metadata?.type !== "voucher" || !voucherId) return { ok: false, error: "Not a voucher payment" };
  if (session.payment_status !== "paid") return { ok: false, error: "Payment not completed" };
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  await activateVoucher(voucherId, paymentIntentId);
  const voucher = await prisma.giftVoucher.findUnique({ where: { id: voucherId } });
  if (!voucher || voucher.status !== "active") return { ok: false, error: "Voucher not found" };
  return {
    ok: true,
    code: voucher.code,
    amount: voucher.initialAmount,
    recipientName: voucher.recipientName,
    recipientEmail: voucher.recipientEmail,
    expiresAt: voucher.expiresAt,
    purchaserEmail: voucher.purchaserEmail,
  };
}

export type VoucherLookup =
  | { ok: true; id: string; code: string; balance: number; expiresAt: Date | null }
  | { ok: false; error: string };

export async function lookupVoucher(codeInput: unknown, now: Date = new Date()): Promise<VoucherLookup> {
  const code = normalizeVoucherCode(codeInput);
  if (!code) return { ok: false, error: "That doesn't look like a voucher code (e.g. BB-ABCD-2345)." };
  const voucher = await prisma.giftVoucher.findUnique({ where: { code } });
  if (!voucher || voucher.status === "pending_payment") return { ok: false, error: "We couldn't find that voucher code." };
  if (voucher.status !== "active") return { ok: false, error: "This voucher is no longer valid." };
  if (voucher.expiresAt && voucher.expiresAt < now) return { ok: false, error: "This voucher has expired." };
  if (voucher.balance <= 0) return { ok: false, error: "This voucher has been fully used." };
  return { ok: true, id: voucher.id, code: voucher.code, balance: voucher.balance, expiresAt: voucher.expiresAt };
}

/** Takes value off a voucher for a deposit. Returns how much was taken (0 if nothing applies). */
export async function claimVoucherForDeposit(
  codeInput: unknown,
  deposit: number
): Promise<{ ok: true; voucherId: string; amount: number } | { ok: false; error: string }> {
  const voucher = await lookupVoucher(codeInput);
  if (!voucher.ok) return voucher;
  const { voucher: amount } = voucherDepositSplit(deposit, voucher.balance);
  if (amount <= 0) return { ok: false, error: "This voucher can't be used for this deposit." };
  const claimed = await prisma.giftVoucher.updateMany({
    where: { id: voucher.id, status: "active", balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (claimed.count === 0) return { ok: false, error: "This voucher's balance has changed. Please try again." };
  return { ok: true, voucherId: voucher.id, amount };
}

export async function recordVoucherTransaction(
  voucherId: string,
  amount: number,
  note: string,
  bookingId?: string
): Promise<void> {
  await prisma.voucherTransaction.create({ data: { voucherId, amount, note, bookingId: bookingId ?? null } });
}

/** Puts a booking's voucher part back on the voucher (once). Returns the amount returned. */
export async function restoreVoucherForBooking(bookingId: string, note: string): Promise<number> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { voucherId: true, voucherAmount: true, voucherRestoredAt: true },
  });
  if (!booking?.voucherId || booking.voucherAmount <= 0 || booking.voucherRestoredAt) return 0;
  const claimed = await prisma.booking.updateMany({
    where: { id: bookingId, voucherRestoredAt: null },
    data: { voucherRestoredAt: new Date() },
  });
  if (claimed.count === 0) return 0;
  await prisma.giftVoucher.update({
    where: { id: booking.voucherId },
    data: { balance: { increment: booking.voucherAmount } },
  });
  await recordVoucherTransaction(booking.voucherId, booking.voucherAmount, note, bookingId);
  return booking.voucherAmount;
}

/** Owner adjustment: negative = used in the salon, positive = value added back. */
export async function adjustVoucherBalance(
  voucherId: string,
  delta: number,
  note: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const amount = Math.round(delta * 100) / 100;
  if (!Number.isFinite(amount) || amount === 0) return { ok: false, error: "Enter an amount." };
  const updated = await prisma.giftVoucher.updateMany({
    where: { id: voucherId, status: "active", ...(amount < 0 ? { balance: { gte: -amount } } : {}) },
    data: { balance: { increment: amount } },
  });
  if (updated.count === 0) {
    return { ok: false, error: amount < 0 ? "That's more than the voucher's balance." : "Voucher isn't active." };
  }
  await recordVoucherTransaction(voucherId, amount, note);
  return { ok: true };
}

/** Voucher sold in the salon (paid in person) — active straight away. */
export async function createSalonVoucher(input: {
  amount: unknown;
  recipientName: unknown;
  recipientEmail?: unknown;
  note?: unknown;
  sendEmail?: boolean;
}): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  if (!isValidVoucherAmount(input.amount)) {
    return { ok: false, error: "Amount must be between £10 and £500 (whole pounds)." };
  }
  const recipientEmail = clean(input.recipientEmail, 254)?.toLowerCase() ?? null;
  if (recipientEmail && !EMAIL_RE.test(recipientEmail)) return { ok: false, error: "Check the email address." };
  const amount = Number(input.amount);
  const now = new Date();
  const voucher = await prisma.giftVoucher.create({
    data: {
      code: await uniqueVoucherCode(),
      initialAmount: amount,
      balance: amount,
      status: "active",
      soldInSalon: true,
      purchaserName: "Sold in salon",
      purchaserEmail: recipientEmail ?? "",
      recipientName: clean(input.recipientName, 120),
      recipientEmail,
      message: clean(input.note, 500),
      paidAt: now,
      expiresAt: addMonths(now, VOUCHER_VALID_MONTHS),
    },
  });
  await recordVoucherTransaction(voucher.id, amount, "Sold in salon");
  if (input.sendEmail && recipientEmail) {
    const { sendGiftVoucherEmails } = await import("@/lib/email");
    await sendGiftVoucherEmails(voucher.id);
  }
  return { ok: true, code: voucher.code };
}
