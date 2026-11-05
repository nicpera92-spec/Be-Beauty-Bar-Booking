import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  MAX_CERTIFICATE_ITEMS,
  VOUCHER_VALID_MONTHS,
  describeCertificateItem,
  matchCertificateItem,
  normalizeVoucherCode,
  randomVoucherCodeFrom,
  sumPrices,
  voucherDepositSplit,
  voucherRefundAmount,
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

export type GiftService = {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMin: number;
  technicianId: string;
  technicianName: string;
};

export type GiftPackageOption = {
  id: string;
  name: string;
  description: string;
  price: number;
  /** What the treatments would cost on their own. */
  value: number;
  services: GiftService[];
};

/** Treatments that can go on a certificate: active, priced, with an active technician. */
async function giftableServices(): Promise<GiftService[]> {
  const services = await prisma.service.findMany({
    where: { active: true, price: { gt: 0 }, technician: { active: true } },
    include: { technician: { select: { name: true, position: true } } },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  return services
    .sort((a, b) => a.technician.position - b.technician.position)
    .map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      price: s.price,
      durationMin: s.durationMin,
      technicianId: s.technicianId,
      technicianName: s.technician.name,
    }));
}

function packageOption(
  pkg: { id: string; name: string; description: string | null; price: number; serviceIds: string[] },
  byId: Map<string, GiftService>
): GiftPackageOption | null {
  const services = pkg.serviceIds.map((id) => byId.get(id));
  if (services.length === 0 || services.some((s) => !s)) return null;
  const list = services as GiftService[];
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description ?? "",
    price: pkg.price,
    value: sumPrices(list),
    services: list,
  };
}

/** Everything the gift certificate page offers. Packages with a removed treatment are hidden. */
export async function getGiftOptions(): Promise<{ services: GiftService[]; packages: GiftPackageOption[] }> {
  const [services, packages] = await Promise.all([
    giftableServices(),
    prisma.giftPackage.findMany({ where: { active: true }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
  ]);
  const byId = new Map(services.map((s) => [s.id, s]));
  return {
    services,
    packages: packages.map((p) => packageOption(p, byId)).filter((p): p is GiftPackageOption => p !== null),
  };
}

type SelectedItem = { serviceId: string; serviceName: string; technicianName: string; price: number };
type Selection = { items: SelectedItem[]; total: number; packageName: string | null };

/** Turns { packageId } or { serviceIds } into priced certificate treatments. */
async function resolveSelection(input: { packageId?: unknown; serviceIds?: unknown }): Promise<
  { ok: true; selection: Selection } | { ok: false; error: string }
> {
  const services = await giftableServices();
  const byId = new Map(services.map((s) => [s.id, s]));
  const toItem = (s: GiftService): SelectedItem => ({
    serviceId: s.id,
    serviceName: s.name,
    technicianName: s.technicianName,
    price: s.price,
  });

  if (typeof input.packageId === "string" && input.packageId) {
    const pkg = await prisma.giftPackage.findUnique({ where: { id: input.packageId } });
    const option = pkg?.active ? packageOption(pkg, byId) : null;
    if (!option) return { ok: false, error: "That gift package isn't available any more." };
    return {
      ok: true,
      selection: { items: option.services.map(toItem), total: option.price, packageName: option.name },
    };
  }

  const ids = Array.isArray(input.serviceIds) ? input.serviceIds.filter((id) => typeof id === "string") : [];
  if (ids.length === 0) return { ok: false, error: "Please choose at least one treatment." };
  if (ids.length > MAX_CERTIFICATE_ITEMS) {
    return { ok: false, error: `A gift certificate can hold up to ${MAX_CERTIFICATE_ITEMS} treatments.` };
  }
  const chosen = ids.map((id) => byId.get(id));
  if (chosen.some((s) => !s)) return { ok: false, error: "One of those treatments isn't available any more." };
  const items = (chosen as GiftService[]).map(toItem);
  return { ok: true, selection: { items, total: sumPrices(items), packageName: null } };
}

async function createCertificate(
  selection: Selection,
  data: {
    purchaserName: string;
    purchaserEmail: string;
    recipientName: string | null;
    recipientEmail: string | null;
    message: string | null;
    soldInSalon?: boolean;
  }
) {
  const now = new Date();
  return prisma.giftVoucher.create({
    data: {
      code: await uniqueVoucherCode(),
      kind: "certificate",
      packageName: selection.packageName,
      initialAmount: selection.total,
      balance: 0,
      ...data,
      ...(data.soldInSalon && { status: "active", paidAt: now, expiresAt: addMonths(now, VOUCHER_VALID_MONTHS) }),
      items: {
        create: selection.items.map((item, position) => ({ ...item, position })),
      },
    },
  });
}

export type CertificatePurchaseInput = {
  packageId?: unknown;
  serviceIds?: unknown;
  purchaserName: unknown;
  purchaserEmail: unknown;
  recipientName?: unknown;
  recipientEmail?: unknown;
  /** "recipient" (default) emails it to them; "me" emails it to the buyer to pass on. */
  deliverTo?: unknown;
  message?: unknown;
};

/** Creates an unpaid gift certificate and a Stripe Checkout page for it. */
export async function createVoucherCheckout(
  input: CertificatePurchaseInput
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const purchaserName = clean(input.purchaserName, 120);
  const purchaserEmail = clean(input.purchaserEmail, 254)?.toLowerCase() ?? null;
  const recipientName = clean(input.recipientName, 120);
  const sendToMe = input.deliverTo === "me";
  const recipientEmail = sendToMe ? null : clean(input.recipientEmail, 254)?.toLowerCase() ?? null;
  if (!recipientName) return { ok: false, error: "Please enter who the gift certificate is for." };
  if (!sendToMe && (!recipientEmail || !EMAIL_RE.test(recipientEmail))) {
    return { ok: false, error: "Please enter their email address so we can send it to them." };
  }
  if (!purchaserName || !purchaserEmail || !EMAIL_RE.test(purchaserEmail)) {
    return { ok: false, error: "Please enter your name and a valid email address." };
  }

  const resolved = await resolveSelection(input);
  if (!resolved.ok) return resolved;
  const { selection } = resolved;

  const stripe = await getStripe();
  if (!stripe) return { ok: false, error: "Online payments aren't set up yet. Please contact the salon." };

  const voucher = await createCertificate(selection, {
    purchaserName,
    purchaserEmail,
    recipientName,
    recipientEmail,
    message: clean(input.message, 500),
  });

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = selection.packageName
    ? [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Gift certificate – ${selection.packageName}`,
              description: selection.items.map(describeCertificateItem).join(" + ").slice(0, 500),
            },
            unit_amount: Math.round(selection.total * 100),
          },
          quantity: 1,
        },
      ]
    : selection.items.map((item) => ({
        price_data: {
          currency: "gbp",
          product_data: {
            name: `Gift certificate – ${item.serviceName}`,
            description: `With ${item.technicianName} · for ${recipientName}`,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: 1,
      }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "paypal", "link"],
    metadata: { type: "voucher", voucherId: voucher.id },
    line_items: lineItems,
    success_url: `${baseUrl()}/gift-vouchers/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl()}/gift-vouchers`,
  });
  await prisma.giftVoucher.update({ where: { id: voucher.id }, data: { stripeSessionId: session.id } });
  if (!session.url) return { ok: false, error: "Could not start payment. Please try again." };
  return { ok: true, url: session.url };
}

/** Marks a paid voucher/certificate active (once) and emails it. Safe to call from webhook and return page. */
export async function activateVoucher(voucherId: string, paymentIntentId: string | null): Promise<boolean> {
  const now = new Date();
  const voucher = await prisma.giftVoucher.findUnique({ where: { id: voucherId } });
  if (!voucher) return false;
  const claimed = await prisma.giftVoucher.updateMany({
    where: { id: voucherId, status: "pending_payment" },
    data: {
      status: "active",
      balance: voucher.kind === "credit" ? voucher.initialAmount : 0,
      paidAt: now,
      expiresAt: addMonths(now, VOUCHER_VALID_MONTHS),
      stripePaymentIntentId: paymentIntentId,
    },
  });
  if (claimed.count === 0) return false;
  await prisma.voucherTransaction.create({
    data: {
      voucherId,
      amount: voucher.kind === "credit" ? voucher.initialAmount : 0,
      note: voucher.kind === "credit" ? "Bought online" : `Bought online (£${voucher.initialAmount})`,
    },
  });
  const { sendGiftVoucherEmails } = await import("@/lib/email");
  const r = await sendGiftVoucherEmails(voucherId);
  if (!r.ok) console.error("Gift voucher emails failed:", r.error);
  return true;
}

export type ConfirmedCertificate = {
  code: string;
  amount: number;
  packageName: string | null;
  treatments: string[];
  recipientName: string | null;
  recipientEmail: string | null;
  expiresAt: Date | null;
  purchaserEmail: string;
};

/** Return page after Stripe: activates the certificate if paid and returns what to show. */
export async function confirmVoucherSession(
  sessionId: string
): Promise<({ ok: true } & ConfirmedCertificate) | { ok: false; error: string }> {
  const stripe = await getStripe();
  if (!stripe) return { ok: false, error: "Payments not configured" };
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const voucherId = session.metadata?.voucherId;
  if (session.metadata?.type !== "voucher" || !voucherId) return { ok: false, error: "Not a voucher payment" };
  if (session.payment_status !== "paid") return { ok: false, error: "Payment not completed" };
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  await activateVoucher(voucherId, paymentIntentId);
  const voucher = await prisma.giftVoucher.findUnique({
    where: { id: voucherId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!voucher || voucher.status !== "active") return { ok: false, error: "Voucher not found" };
  return {
    ok: true,
    code: voucher.code,
    amount: voucher.initialAmount,
    packageName: voucher.packageName,
    treatments: voucher.items.map(describeCertificateItem),
    recipientName: voucher.recipientName,
    recipientEmail: voucher.recipientEmail,
    expiresAt: voucher.expiresAt,
    purchaserEmail: voucher.purchaserEmail,
  };
}

type LookupItem = {
  id: string;
  serviceId: string | null;
  serviceName: string;
  technicianName: string | null;
  price: number;
  status: string;
};

export type VoucherLookup =
  | {
      ok: true;
      id: string;
      code: string;
      kind: "credit" | "certificate";
      balance: number;
      expiresAt: Date | null;
      items: LookupItem[];
    }
  | { ok: false; error: string };

export async function lookupVoucher(codeInput: unknown, now: Date = new Date()): Promise<VoucherLookup> {
  const code = normalizeVoucherCode(codeInput);
  if (!code) return { ok: false, error: "That doesn't look like a gift certificate code (e.g. BB-ABCD-2345)." };
  const voucher = await prisma.giftVoucher.findUnique({
    where: { code },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!voucher || voucher.status === "pending_payment") {
    return { ok: false, error: "We couldn't find that gift certificate code." };
  }
  if (voucher.status !== "active") return { ok: false, error: "This gift certificate is no longer valid." };
  if (voucher.expiresAt && voucher.expiresAt < now) return { ok: false, error: "This gift certificate has expired." };
  const kind = voucher.kind === "certificate" ? "certificate" : "credit";
  if (kind === "credit" && voucher.balance <= 0) return { ok: false, error: "This voucher has been fully used." };
  if (kind === "certificate" && !voucher.items.some((i) => i.status === "available")) {
    return { ok: false, error: "Every treatment on this gift certificate has already been booked or used." };
  }
  return {
    ok: true,
    id: voucher.id,
    code: voucher.code,
    kind,
    balance: voucher.balance,
    expiresAt: voucher.expiresAt,
    items: voucher.items.map((i) => ({
      id: i.id,
      serviceId: i.serviceId,
      serviceName: i.serviceName,
      technicianName: i.technicianName,
      price: i.price,
      status: i.status,
    })),
  };
}

/** Explains which treatments a certificate can book when it doesn't cover the chosen one. */
export function certificateMismatchMessage(items: LookupItem[]): string {
  const available = items.filter((i) => i.status === "available").map(describeCertificateItem);
  return `This gift certificate is for ${available.join(", ")}. Please choose ${
    available.length === 1 ? "that treatment" : "one of those treatments"
  } to use it.`;
}

/**
 * Reserves the certificate treatment that pays for booking `service` in full. Call
 * attachCertificateItemToBooking once the booking exists (or releaseCertificateItem if it fails).
 */
export async function claimCertificateItem(
  codeInput: unknown,
  service: { id: string; name: string; price: number }
): Promise<
  { ok: true; voucherId: string; itemId: string; serviceName: string } | { ok: false; error: string }
> {
  const voucher = await lookupVoucher(codeInput);
  if (!voucher.ok) return voucher;
  if (voucher.kind !== "certificate") return { ok: false, error: "This is a credit voucher, not a gift certificate." };
  const item = matchCertificateItem(voucher.items, service);
  if (!item) return { ok: false, error: certificateMismatchMessage(voucher.items) };
  const claimed = await prisma.giftCertificateItem.updateMany({
    where: { id: item.id, status: "available" },
    data: { status: "booked" },
  });
  if (claimed.count === 0) return { ok: false, error: "This treatment has just been booked. Please try again." };
  return { ok: true, voucherId: voucher.id, itemId: item.id, serviceName: item.serviceName };
}

export async function attachCertificateItemToBooking(
  voucherId: string,
  itemId: string,
  booking: { id: string; date: string; startTime: string }
): Promise<void> {
  const item = await prisma.giftCertificateItem.update({
    where: { id: itemId },
    data: { bookingId: booking.id },
  });
  await recordVoucherTransaction(
    voucherId,
    0,
    `${item.serviceName} booked for ${booking.date} ${booking.startTime}`,
    booking.id
  );
}

export async function releaseCertificateItem(itemId: string): Promise<void> {
  await prisma.giftCertificateItem.updateMany({
    where: { id: itemId, status: "booked" },
    data: { status: "available", bookingId: null },
  });
}

/**
 * Puts a cancelled booking's treatment back on its certificate (once). Returns what went back,
 * or null when the booking wasn't paid by a certificate.
 */
export async function releaseCertificateItemForBooking(
  bookingId: string,
  note: string
): Promise<{ serviceName: string; code: string } | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { certificateItemId: true },
  });
  if (!booking?.certificateItemId) return null;
  const released = await prisma.giftCertificateItem.updateMany({
    // A cancelled (refunded) certificate doesn't take treatments back.
    where: { id: booking.certificateItemId, status: "booked", bookingId, voucher: { status: "active" } },
    data: { status: "available", bookingId: null },
  });
  if (released.count === 0) return null;
  const item = await prisma.giftCertificateItem.findUnique({
    where: { id: booking.certificateItemId },
    include: { voucher: { select: { id: true, code: true } } },
  });
  if (!item) return null;
  await recordVoucherTransaction(item.voucher.id, 0, `${note}: ${item.serviceName}`, bookingId);
  return { serviceName: item.serviceName, code: item.voucher.code };
}

/** A cancelled certificate booking being confirmed again takes its treatment back, if still free. */
export async function reclaimCertificateItemForBooking(bookingId: string): Promise<boolean> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { certificateItemId: true },
  });
  if (!booking?.certificateItemId) return true;
  const claimed = await prisma.giftCertificateItem.updateMany({
    where: { id: booking.certificateItemId, status: "available" },
    data: { status: "booked", bookingId },
  });
  return claimed.count > 0;
}

/**
 * Takes value off a credit voucher for a deposit. `salon` is any few pence the voucher couldn't cover
 * that move to the balance paid in person (see voucherDepositSplit).
 */
export async function claimVoucherForDeposit(
  codeInput: unknown,
  deposit: number
): Promise<{ ok: true; voucherId: string; amount: number; salon: number } | { ok: false; error: string }> {
  const voucher = await lookupVoucher(codeInput);
  if (!voucher.ok) return voucher;
  if (voucher.kind !== "credit") return { ok: false, error: "This gift certificate doesn't cover this treatment." };
  const { voucher: amount, salon } = voucherDepositSplit(deposit, voucher.balance);
  if (amount <= 0) return { ok: false, error: "This voucher can't be used for this deposit." };
  const claimed = await prisma.giftVoucher.updateMany({
    where: { id: voucher.id, status: "active", balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (claimed.count === 0) return { ok: false, error: "This voucher's balance has changed. Please try again." };
  return { ok: true, voucherId: voucher.id, amount, salon };
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

/** Owner adjustment on an old credit voucher: negative = used in the salon, positive = value added back. */
export async function adjustVoucherBalance(
  voucherId: string,
  delta: number,
  note: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const amount = Math.round(delta * 100) / 100;
  if (!Number.isFinite(amount) || amount === 0) return { ok: false, error: "Enter an amount." };
  const updated = await prisma.giftVoucher.updateMany({
    where: {
      id: voucherId,
      kind: "credit",
      status: "active",
      ...(amount < 0 ? { balance: { gte: -amount } } : {}),
    },
    data: { balance: { increment: amount } },
  });
  if (updated.count === 0) {
    return { ok: false, error: amount < 0 ? "That's more than the voucher's balance." : "Voucher isn't active." };
  }
  await recordVoucherTransaction(voucherId, amount, note);
  return { ok: true };
}

/** Owner marks a certificate treatment as used in the salon (walk-in), or undoes that. */
export async function setCertificateItemUsed(
  voucherId: string,
  itemId: string,
  used: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await prisma.giftCertificateItem.updateMany({
    where: used
      ? { id: itemId, voucherId, status: "available", voucher: { status: "active" } }
      : { id: itemId, voucherId, status: "used", bookingId: null },
    data: used ? { status: "used", usedAt: new Date() } : { status: "available", usedAt: null },
  });
  if (updated.count === 0) {
    return { ok: false, error: used ? "That treatment isn't available to use." : "That treatment can't be made available." };
  }
  const item = await prisma.giftCertificateItem.findUnique({ where: { id: itemId }, select: { serviceName: true } });
  await recordVoucherTransaction(
    voucherId,
    0,
    `${used ? "Used in salon" : "Made available again"}: ${item?.serviceName ?? "treatment"}`
  );
  return { ok: true };
}

export type VoucherCancelResult =
  | {
      ok: true;
      refundAmount: number;
      /** refunded = sent back by Stripe; manual = salon sale or Stripe failed, refund it yourself. */
      refund: "refunded" | "manual" | "none";
    }
  | { ok: false; error: string };

/**
 * Voids a certificate (the code stops working) and refunds the buyer for treatments not yet
 * booked or used. Treatments already booked stay booked. Safe to call twice — only the first runs.
 */
export async function cancelVoucherWithRefund(voucherId: string, note: string | null): Promise<VoucherCancelResult> {
  const voucher = await prisma.giftVoucher.findUnique({ where: { id: voucherId }, include: { items: true } });
  if (!voucher || voucher.status !== "active") return { ok: false, error: "This certificate isn't active." };
  const claimed = await prisma.giftVoucher.updateMany({
    where: { id: voucherId, status: "active" },
    data: { status: "cancelled", ...(voucher.kind === "credit" && { balance: 0 }) },
  });
  if (claimed.count === 0) return { ok: false, error: "This certificate isn't active." };

  const refundAmount = voucherRefundAmount(voucher);
  let refund: "refunded" | "manual" | "none" = "none";
  if (refundAmount >= 0.01) {
    refund = "manual";
    const stripe = voucher.stripePaymentIntentId && !voucher.soldInSalon ? await getStripe() : null;
    if (stripe && voucher.stripePaymentIntentId) {
      try {
        await stripe.refunds.create({
          payment_intent: voucher.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100),
          reason: "requested_by_customer",
        });
        refund = "refunded";
      } catch (e) {
        console.error("Gift certificate refund failed:", e);
      }
    }
  }

  const refundNote =
    refund === "refunded"
      ? ` – £${refundAmount.toFixed(2)} refunded by card`
      : refund === "manual"
        ? ` – £${refundAmount.toFixed(2)} to refund ${voucher.soldInSalon ? "in the salon" : "manually (Stripe refund failed)"}`
        : "";
  await recordVoucherTransaction(voucherId, 0, `${note ?? "Certificate cancelled"}${refundNote}`);

  if (refund === "refunded" && voucher.purchaserEmail) {
    const { sendGiftCertificateRefundEmail } = await import("@/lib/email");
    await sendGiftCertificateRefundEmail(voucherId, refundAmount);
  }
  return { ok: true, refundAmount, refund };
}

/** Gift certificate sold in the salon (paid in person) — active straight away. */
export async function createSalonCertificate(input: {
  packageId?: unknown;
  serviceIds?: unknown;
  recipientName: unknown;
  recipientEmail?: unknown;
  message?: unknown;
  sendEmail?: boolean;
}): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const recipientEmail = clean(input.recipientEmail, 254)?.toLowerCase() ?? null;
  if (recipientEmail && !EMAIL_RE.test(recipientEmail)) return { ok: false, error: "Check the email address." };
  const resolved = await resolveSelection(input);
  if (!resolved.ok) return resolved;
  const voucher = await createCertificate(resolved.selection, {
    purchaserName: "Sold in salon",
    purchaserEmail: recipientEmail ?? "",
    recipientName: clean(input.recipientName, 120),
    recipientEmail,
    message: clean(input.message, 500),
    soldInSalon: true,
  });
  await recordVoucherTransaction(voucher.id, 0, `Sold in salon (£${resolved.selection.total})`);
  if (input.sendEmail && recipientEmail) {
    const { sendGiftVoucherEmails } = await import("@/lib/email");
    await sendGiftVoucherEmails(voucher.id);
  }
  return { ok: true, code: voucher.code };
}
