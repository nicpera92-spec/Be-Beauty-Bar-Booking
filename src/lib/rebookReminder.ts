import * as jose from "jose";
import { addDays, format, parse, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { formatUKPhoneToE164 } from "@/lib/sms";

const DEFAULT_REBOOK_DAYS = 21;

function jwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_SECRET || "fallback-dev-only";
  return new TextEncoder().encode(secret);
}

export function normalizeContactEmail(email: string | null | undefined): string | null {
  if (!email?.trim()) return null;
  return email.trim().toLowerCase();
}

export function normalizeContactPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  try {
    return formatUKPhoneToE164(phone.trim());
  } catch {
    return null;
  }
}

export function contactKeyForBooking(booking: {
  customerEmail: string | null;
  customerPhone: string | null;
}): string | null {
  return normalizeContactEmail(booking.customerEmail) ?? normalizeContactPhone(booking.customerPhone);
}

/** Days after a visit date when the rebook reminder should be sent. */
export function rebookReminderDueDate(visitDate: string, daysAfter: number): string {
  return format(
    addDays(parse(visitDate, "yyyy-MM-dd", new Date()), daysAfter),
    "yyyy-MM-dd"
  );
}

export async function isRebookReminderEnabled(): Promise<boolean> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { rebookReminderEnabled: true },
  });
  return settings?.rebookReminderEnabled ?? false;
}

export async function getRebookReminderDaysAfter(): Promise<number> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { rebookReminderDaysAfter: true },
  });
  const days = settings?.rebookReminderDaysAfter ?? DEFAULT_REBOOK_DAYS;
  return Math.min(365, Math.max(7, days));
}

export async function createRebookOptOutToken(payload: {
  email?: string;
  phone?: string;
}): Promise<string> {
  return new jose.SignJWT({
    purpose: "rebook_opt_out",
    email: payload.email ?? null,
    phone: payload.phone ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("365d")
    .sign(jwtSecret());
}

export async function verifyRebookOptOutToken(
  token: string
): Promise<{ email?: string; phone?: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, jwtSecret());
    if (payload.purpose !== "rebook_opt_out") return null;
    const email = typeof payload.email === "string" ? payload.email : undefined;
    const phone = typeof payload.phone === "string" ? payload.phone : undefined;
    if (!email && !phone) return null;
    return { email, phone };
  } catch {
    return null;
  }
}

export async function setRebookReminderOptOut(payload: {
  email?: string;
  phone?: string;
}): Promise<void> {
  const email = normalizeContactEmail(payload.email);
  const phone = normalizeContactPhone(payload.phone);
  if (!email && !phone) return;

  const now = new Date();

  if (email) {
    await prisma.customerNotificationPreference.upsert({
      where: { email },
      create: { email, rebookReminderOptOut: true, rebookOptOutAt: now },
      update: { rebookReminderOptOut: true, rebookOptOutAt: now },
    });
  }

  if (phone) {
    await prisma.customerNotificationPreference.upsert({
      where: { phone },
      create: { phone, rebookReminderOptOut: true, rebookOptOutAt: now },
      update: { rebookReminderOptOut: true, rebookOptOutAt: now },
    });
  }
}

export async function isRebookReminderOptedOut(
  email: string | null | undefined,
  phone: string | null | undefined
): Promise<boolean> {
  const normalizedEmail = normalizeContactEmail(email);
  const normalizedPhone = normalizeContactPhone(phone);

  if (normalizedEmail) {
    const pref = await prisma.customerNotificationPreference.findUnique({
      where: { email: normalizedEmail },
      select: { rebookReminderOptOut: true },
    });
    if (pref?.rebookReminderOptOut) return true;
  }

  if (normalizedPhone) {
    const pref = await prisma.customerNotificationPreference.findUnique({
      where: { phone: normalizedPhone },
      select: { rebookReminderOptOut: true },
    });
    if (pref?.rebookReminderOptOut) return true;
  }

  return false;
}

export async function buildRebookOptOutLink(
  email: string | null | undefined,
  phone: string | null | undefined
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const token = await createRebookOptOutToken({
    email: normalizeContactEmail(email) ?? undefined,
    phone: normalizeContactPhone(phone) ?? undefined,
  });
  return `${baseUrl}/rebook-reminder/opt-out?token=${encodeURIComponent(token)}`;
}

type BookingWithRelations = Awaited<
  ReturnType<typeof prisma.booking.findMany<{ include: { service: true; technician: true } }>>
>[number];

/** Most recent confirmed visit per customer (by email or phone). Rebooking resets the timer. */
export function latestVisitPerContact(
  bookings: BookingWithRelations[]
): BookingWithRelations[] {
  const latest = new Map<string, BookingWithRelations>();

  for (const booking of bookings) {
    const key = contactKeyForBooking(booking);
    if (!key || latest.has(key)) continue;
    latest.set(key, booking);
  }

  return [...latest.values()];
}

type ContactBooking = { date: string; customerEmail: string | null; customerPhone: string | null };

export type LatestBookingIndex = { byEmail: Map<string, string>; byPhone: Map<string, string> };

/** Latest booking date for each email and each phone (normalised), across past and upcoming bookings. */
export function indexLatestBookingDates(bookings: ContactBooking[]): LatestBookingIndex {
  const byEmail = new Map<string, string>();
  const byPhone = new Map<string, string>();
  const keep = (map: Map<string, string>, key: string | null, date: string) => {
    if (!key) return;
    const current = map.get(key);
    if (!current || date > current) map.set(key, date);
  };
  for (const b of bookings) {
    keep(byEmail, normalizeContactEmail(b.customerEmail), b.date);
    keep(byPhone, normalizeContactPhone(b.customerPhone), b.date);
  }
  return { byEmail, byPhone };
}

/** True when this customer (same email or same phone) has a booking dated after this visit. */
export function hasLaterBooking(visit: ContactBooking, index: LatestBookingIndex): boolean {
  const email = normalizeContactEmail(visit.customerEmail);
  const phone = normalizeContactPhone(visit.customerPhone);
  const laterByEmail = email ? (index.byEmail.get(email) ?? "") > visit.date : false;
  const laterByPhone = phone ? (index.byPhone.get(phone) ?? "") > visit.date : false;
  return laterByEmail || laterByPhone;
}

export async function processRebookReminders(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  daysAfter: number;
  today: string;
}> {
  if (!(await isRebookReminderEnabled())) {
    return { sent: 0, failed: 0, skipped: 0, daysAfter: 0, today: "" };
  }

  const daysAfter = await getRebookReminderDaysAfter();
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");

  const [confirmedVisits, liveBookings] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: "confirmed",
        date: { lte: today },
      },
      include: { service: true, technician: true },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
    }),
    // Every live booking, including upcoming ones — anyone who has already rebooked must be skipped.
    prisma.booking.findMany({
      where: { status: { in: ["confirmed", "pending_deposit"] } },
      select: { date: true, customerEmail: true, customerPhone: true },
    }),
  ]);
  const latestByContact = indexLatestBookingDates(liveBookings);

  const candidates = latestVisitPerContact(confirmedVisits).filter(
    (booking) =>
      rebookReminderDueDate(booking.date, daysAfter) === today &&
      booking.rebookReminderSentAt === null &&
      !hasLaterBooking(booking, latestByContact)
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const booking of candidates) {
    const canEmail = Boolean(booking.notifyByEmail && booking.customerEmail);
    const canSms = Boolean(booking.notifyBySMS && booking.customerPhone);
    if (!canEmail && !canSms) {
      skipped++;
      continue;
    }

    if (await isRebookReminderOptedOut(booking.customerEmail, booking.customerPhone)) {
      skipped++;
      continue;
    }

    const { sendRebookReminderEmails } = await import("@/lib/email");
    const result = await sendRebookReminderEmails(booking.id);
    if (result.ok) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { rebookReminderSentAt: new Date() },
      });
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed, skipped, daysAfter, today };
}
