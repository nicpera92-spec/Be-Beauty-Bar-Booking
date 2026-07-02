import * as jose from "jose";
import { endOfDay, format, parse, startOfToday } from "date-fns";
import { prisma } from "@/lib/prisma";

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

export async function createWaitlistBookingToken(
  claims: WaitlistBookingTokenClaims
): Promise<string> {
  const expiresAt = endOfDay(parse(claims.date, "yyyy-MM-dd", new Date()));
  return new jose.SignJWT({
    purpose: TOKEN_PURPOSE,
    entryId: claims.entryId,
    date: claims.date,
    serviceId: claims.serviceId,
    technicianId: claims.technicianId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
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

/** True when a waitlist notification link grants same-day booking for this context. */
export async function hasWaitlistSameDayBookingAccess(
  token: string | null | undefined,
  context: { date: string; serviceId: string; technicianId: string }
): Promise<boolean> {
  if (!token?.trim()) return false;

  const today = format(startOfToday(), "yyyy-MM-dd");
  if (context.date !== today) return false;

  const claims = await verifyWaitlistBookingToken(token.trim());
  if (!claims) return false;
  if (claims.date !== context.date) return false;
  if (claims.serviceId !== context.serviceId) return false;
  if (claims.technicianId !== context.technicianId) return false;

  const entry = await prisma.waitingListEntry.findUnique({
    where: { id: claims.entryId },
    select: {
      status: true,
      notifiedSlotDate: true,
      serviceId: true,
      technicianId: true,
    },
  });
  if (!entry || entry.status !== "active") return false;
  if (entry.notifiedSlotDate !== context.date) return false;
  if (entry.serviceId !== context.serviceId || entry.technicianId !== context.technicianId) {
    return false;
  }

  return true;
}
