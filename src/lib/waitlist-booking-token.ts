import * as jose from "jose";
import { prisma } from "@/lib/prisma";
import { businessDateStr, businessEndOfDayUtc } from "@/lib/business-time";
import { waitlistEntryInterestedInDate } from "@/lib/waitlist";

const TOKEN_PURPOSE = "waitlist_same_day_booking";

function jwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback-dev-only";
  return new TextEncoder().encode(secret);
}

export type WaitlistBookingTokenClaims = {
  entryId: string;
  date: string;
  serviceId: string;
  technicianId: string;
};

export type WaitlistEntryForAccess = {
  status: string;
  serviceId: string;
  technicianId: string;
  preferredDate: string;
  preferredDateEnd: string | null;
  notifyEarliest: boolean;
};

export async function createWaitlistBookingToken(
  claims: WaitlistBookingTokenClaims
): Promise<string> {
  return new jose.SignJWT({
    purpose: TOKEN_PURPOSE,
    entryId: claims.entryId,
    date: claims.date,
    serviceId: claims.serviceId,
    technicianId: claims.technicianId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(businessEndOfDayUtc(claims.date))
    .sign(jwtSecret());
}

export async function verifyWaitlistBookingToken(
  token: string
): Promise<WaitlistBookingTokenClaims | null> {
  try {
    const { payload } = await jose.jwtVerify(token, jwtSecret());
    if (payload.purpose !== TOKEN_PURPOSE) return null;
    const entryId = payload.entryId;
    const date = payload.date;
    const serviceId = payload.serviceId;
    const technicianId = payload.technicianId;
    if (
      typeof entryId !== "string" ||
      typeof date !== "string" ||
      typeof serviceId !== "string" ||
      typeof technicianId !== "string"
    ) {
      return null;
    }
    return { entryId, date, serviceId, technicianId };
  } catch {
    return null;
  }
}

/** Pure validation — used by tests and hasWaitlistSameDayBookingAccess. */
export function validateWaitlistBookingAccess(
  claims: WaitlistBookingTokenClaims,
  context: { date: string; serviceId: string; technicianId: string },
  today: string,
  entry: WaitlistEntryForAccess | null
): boolean {
  if (claims.date !== context.date) return false;
  if (claims.date !== today) return false;
  if (claims.serviceId !== context.serviceId) return false;
  if (claims.technicianId !== context.technicianId) return false;
  if (!entry || entry.status !== "active") return false;
  if (entry.serviceId !== context.serviceId || entry.technicianId !== context.technicianId) {
    return false;
  }
  return waitlistEntryInterestedInDate(entry, context.date);
}

/** True when a waitlist notification link grants same-day booking for this context. */
export async function hasWaitlistSameDayBookingAccess(
  token: string | null | undefined,
  context: { date: string; serviceId: string; technicianId: string },
  at: Date = new Date()
): Promise<boolean> {
  if (!token?.trim()) return false;

  const claims = await verifyWaitlistBookingToken(token.trim());
  if (!claims) return false;

  const today = businessDateStr(at);
  const entry = await prisma.waitingListEntry.findUnique({
    where: { id: claims.entryId },
    select: {
      status: true,
      serviceId: true,
      technicianId: true,
      preferredDate: true,
      preferredDateEnd: true,
      notifyEarliest: true,
    },
  });

  return validateWaitlistBookingAccess(claims, context, today, entry);
}

/** Decode token date without DB lookup (for calendar prefetch). */
export async function getWaitlistTokenBookingDate(
  token: string | null | undefined
): Promise<string | null> {
  if (!token?.trim()) return null;
  const claims = await verifyWaitlistBookingToken(token.trim());
  return claims?.date ?? null;
}
