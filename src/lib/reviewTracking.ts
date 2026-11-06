import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeContactEmail, normalizeContactPhone } from "@/lib/rebookReminder";

const SIGNATURE_LENGTH = 10;

function signingSecret(): string {
  return process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback-dev-only";
}

function reviewSignature(bookingId: string): string {
  return createHmac("sha256", signingSecret())
    .update(`review_link:${bookingId}`)
    .digest("base64url")
    .slice(0, SIGNATURE_LENGTH);
}

/** Review link that goes through our site first, so we know the customer opened it. */
export function buildReviewTrackingLink(bookingId: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");
  return `${baseUrl}/r/${bookingId}.${reviewSignature(bookingId)}`;
}

/** Booking id from a /r/<id>.<sig> token, or null if it's been tampered with. */
export function verifyReviewToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const bookingId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(reviewSignature(bookingId));
  return given.length === expected.length && timingSafeEqual(given, expected) ? bookingId : null;
}

type Contact = { customerEmail: string | null; customerPhone: string | null };

/** Never ask this customer (by email and by phone) for a review again — or undo that. */
export async function setCustomerReviewed(
  contact: Contact,
  reviewed: boolean,
  source: "link" | "owner"
): Promise<void> {
  const email = normalizeContactEmail(contact.customerEmail);
  const phone = normalizeContactPhone(contact.customerPhone);
  const data = reviewed
    ? { reviewedAt: new Date(), reviewSource: source }
    : { reviewedAt: null, reviewSource: null };
  if (email) {
    await prisma.customerNotificationPreference.upsert({ where: { email }, create: { email, ...data }, update: data });
  }
  if (phone) {
    await prisma.customerNotificationPreference.upsert({ where: { phone }, create: { phone, ...data }, update: data });
  }
}

export type ReviewedLookup = (contact: Contact) => "link" | "owner" | null;

/** Who has already reviewed (or opened the review link), matched by email or phone. */
export async function loadReviewedLookup(): Promise<ReviewedLookup> {
  const prefs = await prisma.customerNotificationPreference.findMany({
    where: { reviewedAt: { not: null } },
    select: { email: true, phone: true, reviewSource: true },
  });
  const byEmail = new Map<string, "link" | "owner">();
  const byPhone = new Map<string, "link" | "owner">();
  for (const p of prefs) {
    const source = p.reviewSource === "owner" ? "owner" : "link";
    if (p.email) byEmail.set(p.email, source);
    if (p.phone) byPhone.set(p.phone, source);
  }
  return (contact) => {
    const email = normalizeContactEmail(contact.customerEmail);
    const phone = normalizeContactPhone(contact.customerPhone);
    return (email && byEmail.get(email)) || (phone && byPhone.get(phone)) || null;
  };
}
