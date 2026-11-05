import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import * as jose from "jose";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { formatUKPhoneToE164 } from "@/lib/sms";
import { businessDateStr } from "@/lib/business-time";
import { buildCancelLink } from "@/lib/customerCancellation";

const CODE_TTL_MINUTES = 10;
const MAX_CODES_PER_HOUR = 3;
const MIN_SECONDS_BETWEEN_CODES = 60;
const MAX_ATTEMPTS = 5;
const SESSION_PURPOSE = "customer_portal";

function secret(): string {
  return process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback-dev-only";
}

export type CustomerContact = { type: "email" | "phone"; key: string };

/** Lowercased email or +44 phone; null when the input is neither. */
export function normalizeCustomerContact(input: unknown): CustomerContact | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value || value.length > 254) return null;
  if (value.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { type: "email", key: value.toLowerCase() } : null;
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  return { type: "phone", key: formatUKPhoneToE164(value) };
}

function hashCode(contact: string, code: string): string {
  return createHash("sha256").update(`${secret()}:${contact}:${code}`).digest("hex");
}

export function bookingMatchesContact(
  booking: { customerEmail: string | null; customerPhone: string | null },
  contact: CustomerContact
): boolean {
  if (contact.type === "email") return booking.customerEmail?.trim().toLowerCase() === contact.key;
  return Boolean(booking.customerPhone?.trim()) && formatUKPhoneToE164(booking.customerPhone!) === contact.key;
}

async function bookingIdsForContact(contact: CustomerContact): Promise<string[]> {
  const rows = await prisma.booking.findMany({
    where:
      contact.type === "email"
        ? { customerEmail: { equals: contact.key, mode: "insensitive" } }
        : { customerPhone: { not: null } },
    select: { id: true, customerEmail: true, customerPhone: true },
  });
  return rows.filter((b) => bookingMatchesContact(b, contact)).map((b) => b.id);
}

/**
 * Sends a 6-digit code if this email/phone has bookings. Always resolves the same way so the
 * response doesn't reveal whether someone is a customer.
 */
export async function requestLoginCode(contact: CustomerContact, now: Date = new Date()): Promise<void> {
  const recent = await prisma.customerLoginCode.findMany({
    where: { contact: contact.key, createdAt: { gte: addMinutes(now, -60) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent.length >= MAX_CODES_PER_HOUR) return;
  if (recent[0] && now.getTime() - recent[0].createdAt.getTime() < MIN_SECONDS_BETWEEN_CODES * 1000) return;

  const ids = await bookingIdsForContact(contact);
  if (ids.length === 0) return;

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.customerLoginCode.create({
    data: {
      contact: contact.key,
      codeHash: hashCode(contact.key, code),
      expiresAt: addMinutes(now, CODE_TTL_MINUTES),
    },
  });

  const { sendCustomerLoginCode } = await import("@/lib/email");
  await sendCustomerLoginCode(contact, code);
}

/** Checks a code; on success returns a 1-hour session token for the My bookings page. */
export async function verifyLoginCode(
  contact: CustomerContact,
  code: unknown,
  now: Date = new Date()
): Promise<string | null> {
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) return null;
  const latest = await prisma.customerLoginCode.findFirst({
    where: { contact: contact.key, usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (!latest || latest.attempts >= MAX_ATTEMPTS) return null;

  const expected = Buffer.from(latest.codeHash, "hex");
  const given = Buffer.from(hashCode(contact.key, code.trim()), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await prisma.customerLoginCode.update({
      where: { id: latest.id },
      data: { attempts: { increment: 1 } },
    });
    return null;
  }

  await prisma.customerLoginCode.update({ where: { id: latest.id }, data: { usedAt: now } });
  return new jose.SignJWT({ purpose: SESSION_PURPOSE, type: contact.type, key: contact.key })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret()));
}

export async function verifyPortalSession(token: string | null | undefined): Promise<CustomerContact | null> {
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(secret()));
    if (payload.purpose !== SESSION_PURPOSE) return null;
    if ((payload.type !== "email" && payload.type !== "phone") || typeof payload.key !== "string") return null;
    return { type: payload.type, key: payload.key };
  } catch {
    return null;
  }
}

export type PortalBooking = {
  id: string;
  serviceName: string;
  technicianName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  depositAmount: number;
  upcoming: boolean;
  manageUrl: string | null;
  payDepositUrl: string | null;
};

export async function listPortalBookings(contact: CustomerContact, now: Date = new Date()): Promise<PortalBooking[]> {
  const ids = await bookingIdsForContact(contact);
  if (ids.length === 0) return [];
  const today = businessDateStr(now);
  const bookings = await prisma.booking.findMany({
    where: { id: { in: ids } },
    include: { service: { select: { name: true } }, technician: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    take: 50,
  });
  return bookings.map((b) => {
    const upcoming = b.date >= today && b.status !== "cancelled";
    return {
      id: b.id,
      serviceName: b.service.name,
      technicianName: b.technician.name,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      depositAmount: b.depositAmount,
      upcoming,
      manageUrl: upcoming && b.status === "confirmed" ? buildCancelLink(b.id) : null,
      payDepositUrl: upcoming && b.status === "pending_deposit" ? `/booking/${b.id}` : null,
    };
  });
}
