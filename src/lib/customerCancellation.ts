import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { appointmentStartUtc } from "@/lib/business-time";
import { formatCurrency } from "@/lib/format";
import { DEFAULT_CANCELLATION_REFUND_HOURS, normalizeRefundHours } from "@/lib/cancellationPolicy";

/** Cancellations at least this many hours before the appointment get the deposit refunded. */
export async function getCancellationRefundHours(): Promise<number> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { cancellationRefundHours: true },
  });
  return normalizeRefundHours(settings?.cancellationRefundHours ?? DEFAULT_CANCELLATION_REFUND_HOURS);
}

const SIGNATURE_LENGTH = 16;

function signingSecret(): string {
  return process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback-dev-only";
}

/** Short signature so the cancel link stays compact enough for SMS. */
export function createCancelSignature(bookingId: string): string {
  return createHmac("sha256", signingSecret())
    .update(`customer_cancel:${bookingId}`)
    .digest("base64url")
    .slice(0, SIGNATURE_LENGTH);
}

export function verifyCancelSignature(bookingId: string, signature: string | null | undefined): boolean {
  if (!bookingId || !signature) return false;
  const expected = Buffer.from(createCancelSignature(bookingId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function buildCancelLink(bookingId: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");
  return `${baseUrl}/cancel/${bookingId}/${createCancelSignature(bookingId)}`;
}

const CANCEL_CODE_LENGTH = 10;
const CANCEL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function randomCancelCode(): string {
  const bytes = randomBytes(CANCEL_CODE_LENGTH);
  let code = "";
  for (const byte of bytes) code += CANCEL_CODE_ALPHABET[byte % CANCEL_CODE_ALPHABET.length];
  return code;
}

/** SMS-friendly link without the protocol — phones still make it tappable. */
export function formatShortCancelLink(code: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");
  return `${baseUrl.replace(/^https:\/\//, "")}/c/${code}`;
}

/** Short cancel link for SMS; falls back to the full signed link if a code can't be stored. */
export async function buildShortCancelLink(bookingId: string): Promise<string> {
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { cancelCode: true },
  });
  if (existing?.cancelCode) return formatShortCancelLink(existing.cancelCode);

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = randomCancelCode();
    try {
      await prisma.booking.update({ where: { id: bookingId }, data: { cancelCode: code } });
      return formatShortCancelLink(code);
    } catch (e) {
      console.warn("Could not store cancel code, retrying:", e);
    }
  }
  return buildCancelLink(bookingId);
}

/** Resolves a short cancel code to the full signed cancel page path. */
export async function resolveCancelCode(code: string): Promise<string | null> {
  const booking = await prisma.booking.findUnique({
    where: { cancelCode: code },
    select: { id: true },
  });
  return booking ? `/cancel/${booking.id}/${createCancelSignature(booking.id)}` : null;
}

export { appointmentStartUtc };

export type CustomerCancelState =
  | "refundable"
  | "non_refundable"
  | "already_cancelled"
  | "appointment_passed"
  | "not_confirmed";

export function getCustomerCancelState(
  booking: { status: string; date: string; startTime: string },
  now: Date = new Date(),
  refundHours: number = DEFAULT_CANCELLATION_REFUND_HOURS
): CustomerCancelState {
  if (booking.status === "cancelled") return "already_cancelled";
  if (booking.status !== "confirmed") return "not_confirmed";
  const msUntilStart = appointmentStartUtc(booking.date, booking.startTime).getTime() - now.getTime();
  if (msUntilStart <= 0) return "appointment_passed";
  return msUntilStart >= refundHours * 60 * 60 * 1000
    ? "refundable"
    : "non_refundable";
}

export type DepositRefundOutcome =
  | "refunded"
  | "refund_failed"
  | "manual_refund"
  | "forfeited"
  | "none";

export type BalanceRefundOutcome = "refunded" | "refund_failed" | "none";

export type RefundOutcome = {
  deposit: DepositRefundOutcome;
  balance: BalanceRefundOutcome;
  /** Deposit paid by card (the whole deposit unless a gift voucher paid part of it). */
  depositAmount: number;
  balanceAmount: number;
  refundHours: number;
  /** Deposit paid by gift voucher, and how much of that went back onto the voucher. */
  voucherAmount?: number;
  voucherReturned?: number;
};

function totalDeposit(outcome: RefundOutcome): string {
  return formatCurrency(outcome.depositAmount + (outcome.voucherAmount ?? 0));
}

export function describeRefundForCustomer(outcome: RefundOutcome): string {
  const deposit = formatCurrency(outcome.depositAmount);
  const parts: string[] = [];
  const paidByVoucherOnly = outcome.depositAmount <= 0 && (outcome.voucherAmount ?? 0) > 0;
  switch (paidByVoucherOnly && outcome.deposit !== "forfeited" ? "voucher_only" : outcome.deposit) {
    case "refunded":
      parts.push(
        `Your deposit of ${deposit} has been refunded to your original payment method. Please allow 5–10 working days for it to appear.`
      );
      break;
    case "refund_failed":
    case "manual_refund":
      parts.push(`Your deposit of ${deposit} will be refunded — we'll process this for you shortly.`);
      break;
    case "forfeited":
      parts.push(
        `As you cancelled within ${outcome.refundHours} hours of your appointment, your deposit of ${totalDeposit(outcome)} is non-refundable, in line with our cancellation policy.`
      );
      break;
    case "none":
      parts.push("No deposit was taken for this booking, so there is nothing to refund.");
      break;
  }
  if ((outcome.voucherReturned ?? 0) > 0) {
    parts.push(`${formatCurrency(outcome.voucherReturned!)} has been returned to your gift voucher.`);
  }
  const balance = formatCurrency(outcome.balanceAmount);
  if (outcome.balance === "refunded") {
    parts.push(`The ${balance} you prepaid online has also been refunded.`);
  } else if (outcome.balance === "refund_failed") {
    parts.push(`We'll also refund the ${balance} you prepaid online shortly.`);
  }
  return parts.join(" ");
}

export function describeRefundForOwner(outcome: RefundOutcome): string {
  const deposit = formatCurrency(outcome.depositAmount);
  const parts: string[] = [];
  switch (outcome.deposit) {
    case "refunded":
      parts.push(`Deposit of ${deposit} refunded automatically via Stripe.`);
      break;
    case "refund_failed":
      parts.push(
        `Deposit of ${deposit} should be refunded, but the automatic Stripe refund failed — please refund it manually in Stripe.`
      );
      break;
    case "manual_refund":
      parts.push(
        `Deposit of ${deposit} should be refunded, but it wasn't paid through Stripe — please refund the customer manually.`
      );
      break;
    case "forfeited":
      parts.push(
        `Cancelled within ${outcome.refundHours} hours of the appointment — deposit of ${totalDeposit(outcome)} kept (non-refundable).`
      );
      break;
    case "none":
      if (!((outcome.voucherAmount ?? 0) > 0)) parts.push("No deposit was taken.");
      break;
  }
  if ((outcome.voucherReturned ?? 0) > 0) {
    parts.push(`${formatCurrency(outcome.voucherReturned!)} returned to the customer's gift voucher.`);
  }
  const balance = formatCurrency(outcome.balanceAmount);
  if (outcome.balance === "refunded") {
    parts.push(`Prepaid balance of ${balance} refunded automatically via Stripe.`);
  } else if (outcome.balance === "refund_failed") {
    parts.push(
      `Prepaid balance of ${balance} should be refunded, but the automatic Stripe refund failed — please refund it manually in Stripe.`
    );
  }
  return parts.join(" ");
}

function getStripeInstance(stripeSecretKey: string | null | undefined): Stripe | null {
  const secretKey = stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

async function refundPaymentIntent(
  stripe: Stripe | null,
  paymentIntentId: string
): Promise<boolean> {
  if (!stripe) return false;
  try {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
    });
    return true;
  } catch (e) {
    console.error("Customer cancellation refund failed:", e);
    return false;
  }
}

export type CustomerCancelResult =
  | { ok: true; refund: RefundOutcome }
  | { ok: false; state: CustomerCancelState | "not_found" };

/**
 * Cancels a confirmed booking on the customer's behalf. The status change is claimed
 * atomically so a booking can only ever be cancelled (and refunded) once.
 */
export async function cancelBookingByCustomer(
  bookingId: string,
  now: Date = new Date()
): Promise<CustomerCancelResult> {
  const [booking, settings] = await Promise.all([
    prisma.booking.findUnique({ where: { id: bookingId } }),
    prisma.businessSettings.findUnique({
      where: { id: "default" },
      select: { stripeSecretKey: true, smsNotificationFee: true, cancellationRefundHours: true },
    }),
  ]);
  if (!booking) return { ok: false, state: "not_found" };

  const refundHours = normalizeRefundHours(
    settings?.cancellationRefundHours ?? DEFAULT_CANCELLATION_REFUND_HOURS
  );
  const state = getCustomerCancelState(booking, now, refundHours);
  if (state !== "refundable" && state !== "non_refundable") {
    return { ok: false, state };
  }

  const claimed = await prisma.booking.updateMany({
    where: { id: bookingId, status: "confirmed" },
    data: { status: "cancelled", customerCancelledAt: now },
  });
  if (claimed.count === 0) return { ok: false, state: "already_cancelled" };

  const smsFee = settings?.smsNotificationFee ?? 0.05;
  const baseDeposit = booking.depositAmount - (booking.notifyBySMS && booking.depositAmount > 0 ? smsFee : 0);

  const cardDeposit = Math.round((booking.depositAmount - booking.voucherAmount) * 100) / 100;
  const refund: RefundOutcome = {
    deposit: "none",
    balance: "none",
    depositAmount: Math.max(0, cardDeposit),
    balanceAmount: Math.max(0, booking.servicePrice - baseDeposit),
    refundHours,
    voucherAmount: booking.voucherAmount,
    voucherReturned: 0,
  };

  const needsBalanceRefund =
    booking.balancePaidOnline &&
    !booking.balanceRefundedAt &&
    Boolean(booking.stripeBalancePaymentIntentId);
  const stripe = getStripeInstance(settings?.stripeSecretKey);

  if (state === "refundable" && booking.voucherAmount > 0) {
    const { restoreVoucherForBooking } = await import("@/lib/giftVouchers");
    refund.voucherReturned = await restoreVoucherForBooking(
      bookingId,
      "Returned – customer cancelled with free cancellation"
    );
  }

  if (state === "non_refundable" && booking.depositAmount > 0) {
    refund.deposit = "forfeited";
  } else if (cardDeposit > 0) {
    if (booking.depositRefundedAt) {
      refund.deposit = "refunded";
    } else if (!booking.stripeDepositPaymentIntentId) {
      refund.deposit = "manual_refund";
    } else if (await refundPaymentIntent(stripe, booking.stripeDepositPaymentIntentId)) {
      refund.deposit = "refunded";
      await prisma.booking.update({
        where: { id: bookingId },
        data: { depositRefundedAt: new Date() },
      });
    } else {
      refund.deposit = "refund_failed";
    }
  }

  if (needsBalanceRefund && booking.stripeBalancePaymentIntentId) {
    if (await refundPaymentIntent(stripe, booking.stripeBalancePaymentIntentId)) {
      refund.balance = "refunded";
      await prisma.booking.update({
        where: { id: bookingId },
        data: { balanceRefundedAt: new Date() },
      });
    } else {
      refund.balance = "refund_failed";
    }
  }

  const { sendCustomerCancellationEmails } = await import("@/lib/email");
  const r = await sendCustomerCancellationEmails(bookingId, {
    customer: describeRefundForCustomer(refund),
    owner: describeRefundForOwner(refund),
  });
  if (!r.ok) console.error("Failed to send customer cancellation emails:", r.error);

  return { ok: true, refund };
}
