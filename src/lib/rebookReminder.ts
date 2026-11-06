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

/** Latest booking date for this customer (same email or same phone) after this visit, if any. */
export function laterBookingDate(visit: ContactBooking, index: LatestBookingIndex): string | null {
  const email = normalizeContactEmail(visit.customerEmail);
  const phone = normalizeContactPhone(visit.customerPhone);
  const dates = [email ? index.byEmail.get(email) : undefined, phone ? index.byPhone.get(phone) : undefined]
    .filter((d): d is string => Boolean(d) && (d as string) > visit.date)
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}

/** True when this customer (same email or same phone) has a booking dated after this visit. */
export function hasLaterBooking(visit: ContactBooking, index: LatestBookingIndex): boolean {
  return laterBookingDate(visit, index) !== null;
}

/** Missed days (e.g. the 9am run couldn't reach the database) are caught up within this many days. */
export const REBOOK_CATCH_UP_DAYS = 2;

export type RebookVisit = ContactBooking & {
  id: string;
  startTime: string;
  customerName: string;
  notifyByEmail: boolean;
  notifyBySMS: boolean;
  rebookReminderSentAt: Date | string | null;
};

export type RebookSkipReason = "already_booked" | "already_sent" | "no_contact" | "opted_out";

export type RebookDecision<V extends RebookVisit = RebookVisit> = {
  visit: V;
  dueDate: string;
  send: boolean;
  reason?: RebookSkipReason;
  /** When skipped as already booked: the date of their next booking. */
  nextBookingDate?: string;
};

/**
 * Who gets a rebook reminder with a due date between `from` and `to`. Only each customer's most
 * recent visit counts (matched by email or phone), and anyone with a later live booking is skipped.
 */
export function planRebookReminders<V extends RebookVisit>(input: {
  visits: V[];
  liveBookings: ContactBooking[];
  daysAfter: number;
  from: string;
  to: string;
  isOptedOut: (visit: V) => boolean;
}): RebookDecision<V>[] {
  const index = indexLatestBookingDates(input.liveBookings);
  const sorted = [...input.visits].sort((a, b) =>
    a.date === b.date ? b.startTime.localeCompare(a.startTime) : b.date.localeCompare(a.date)
  );
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const decisions: RebookDecision<V>[] = [];

  for (const visit of sorted) {
    const email = normalizeContactEmail(visit.customerEmail);
    const phone = normalizeContactPhone(visit.customerPhone);
    if (!email && !phone) continue;
    const seenBefore = (email && seenEmails.has(email)) || (phone && seenPhones.has(phone));
    if (email) seenEmails.add(email);
    if (phone) seenPhones.add(phone);
    // A more recent (or same-day) visit by the same person already speaks for them.
    if (seenBefore) continue;

    const dueDate = rebookReminderDueDate(visit.date, input.daysAfter);
    if (dueDate < input.from || dueDate > input.to) continue;

    const decision: RebookDecision<V> = { visit, dueDate, send: false };
    const next = laterBookingDate(visit, index);
    if (next) {
      decision.reason = "already_booked";
      decision.nextBookingDate = next;
    } else if (visit.rebookReminderSentAt) {
      decision.reason = "already_sent";
    } else if (!(visit.notifyByEmail && visit.customerEmail) && !(visit.notifyBySMS && visit.customerPhone)) {
      decision.reason = "no_contact";
    } else if (input.isOptedOut(visit)) {
      decision.reason = "opted_out";
    } else {
      decision.send = true;
    }
    decisions.push(decision);
  }
  return decisions.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Opted-out customers, as normalised emails and phones. */
async function loadOptOuts(): Promise<(visit: ContactBooking) => boolean> {
  const prefs = await prisma.customerNotificationPreference.findMany({
    where: { rebookReminderOptOut: true },
    select: { email: true, phone: true },
  });
  const emails = new Set(prefs.map((p) => p.email).filter(Boolean));
  const phones = new Set(prefs.map((p) => p.phone).filter(Boolean));
  return (visit) => {
    const email = normalizeContactEmail(visit.customerEmail);
    const phone = normalizeContactPhone(visit.customerPhone);
    return Boolean((email && emails.has(email)) || (phone && phones.has(phone)));
  };
}

/** Same decisions the daily run makes, for any due-date window (used by the run and the admin preview). */
export async function getRebookReminderPlan(from: string, to: string, daysAfter: number) {
  const latestVisitDate = format(addDays(parse(to, "yyyy-MM-dd", new Date()), -daysAfter), "yyyy-MM-dd");
  const [visits, liveBookings, isOptedOut] = await Promise.all([
    prisma.booking.findMany({
      where: { status: "confirmed", date: { lte: latestVisitDate } },
      include: { service: true, technician: true },
    }),
    // Every live booking, including upcoming ones — anyone who has already rebooked must be skipped.
    prisma.booking.findMany({
      where: { status: { in: ["confirmed", "pending_deposit"] } },
      select: { date: true, customerEmail: true, customerPhone: true },
    }),
    loadOptOuts(),
  ]);
  return planRebookReminders({ visits, liveBookings, daysAfter, from, to, isOptedOut });
}

/** Fresh database check: does this customer (email or phone) have any live booking after the visit? */
async function hasLiveBookingAfter(visit: ContactBooking): Promise<boolean> {
  const later = await prisma.booking.findMany({
    where: { status: { in: ["confirmed", "pending_deposit"] }, date: { gt: visit.date } },
    select: { date: true, customerEmail: true, customerPhone: true },
  });
  return hasLaterBooking(visit, indexLatestBookingDates(later));
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
  const todayDate = startOfDay(new Date());
  const today = format(todayDate, "yyyy-MM-dd");
  const from = format(addDays(todayDate, -REBOOK_CATCH_UP_DAYS), "yyyy-MM-dd");
  const plan = await getRebookReminderPlan(from, today, daysAfter);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const { sendRebookReminderEmails } = await import("@/lib/email");

  for (const decision of plan) {
    if (!decision.send) {
      if (decision.reason !== "already_sent") skipped++;
      continue;
    }
    // Last check right before sending, in case they booked while this run was going.
    if (await hasLiveBookingAfter(decision.visit)) {
      skipped++;
      continue;
    }
    // Claim first so two overlapping runs can never both send to the same visit.
    const claimed = await prisma.booking.updateMany({
      where: { id: decision.visit.id, rebookReminderSentAt: null },
      data: { rebookReminderSentAt: new Date() },
    });
    if (claimed.count === 0) continue;

    const result = await sendRebookReminderEmails(decision.visit.id);
    if (result.ok) {
      sent++;
    } else {
      await prisma.booking.update({
        where: { id: decision.visit.id },
        data: { rebookReminderSentAt: null },
      });
      failed++;
    }
  }

  return { sent, failed, skipped, daysAfter, today };
}

export type SentReminderCheck = {
  bookingId: string;
  customerName: string;
  contact: string;
  serviceName: string;
  visitDate: string;
  sentAt: string;
  /** A live booking after the visit already existed when the reminder went out — it shouldn't have been sent. */
  alreadyBookedDate: string | null;
  alreadyBookedMadeOn: string | null;
  /** First booking made after the reminder (the reminder worked). */
  bookedAfterDate: string | null;
  bookedAfterMadeOn: string | null;
};

type HistoryBooking = ContactBooking & {
  status: string;
  createdAt: Date;
  updatedAt: Date;
  customerCancelledAt: Date | null;
};

/** Was this booking live (made, and not yet cancelled) at `at`? */
function wasLiveAt(b: HistoryBooking, at: Date): boolean {
  if (b.createdAt > at) return false;
  if (b.status !== "cancelled") return true;
  const cancelledAt = b.customerCancelledAt ?? b.updatedAt;
  return cancelledAt > at;
}

/** Checks each reminder that was sent against the bookings the customer had at that moment. */
export function checkSentReminders(
  sent: (RebookVisit & { serviceName: string; rebookReminderSentAt: Date })[],
  history: HistoryBooking[]
): SentReminderCheck[] {
  const sameCustomer = (a: ContactBooking, b: ContactBooking) => {
    const ea = normalizeContactEmail(a.customerEmail);
    const pa = normalizeContactPhone(a.customerPhone);
    return (
      (ea !== null && ea === normalizeContactEmail(b.customerEmail)) ||
      (pa !== null && pa === normalizeContactPhone(b.customerPhone))
    );
  };
  return sent
    .map((visit) => {
      const sentAt = visit.rebookReminderSentAt;
      const theirs = history.filter((b) => sameCustomer(visit, b));
      const existing = theirs
        .filter((b) => b.date > visit.date && wasLiveAt(b, sentAt))
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      const after = theirs
        .filter((b) => b.date > visit.date && b.createdAt > sentAt && b.status !== "cancelled")
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      return {
        bookingId: visit.id,
        customerName: visit.customerName,
        contact: visit.customerEmail || visit.customerPhone || "",
        serviceName: visit.serviceName,
        visitDate: visit.date,
        sentAt: sentAt.toISOString(),
        alreadyBookedDate: existing?.date ?? null,
        alreadyBookedMadeOn: existing ? existing.createdAt.toISOString() : null,
        bookedAfterDate: after?.date ?? null,
        bookedAfterMadeOn: after ? after.createdAt.toISOString() : null,
      };
    })
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export async function getSentReminderChecks(sinceDays = 180): Promise<SentReminderCheck[]> {
  const since = addDays(new Date(), -sinceDays);
  const sent = await prisma.booking.findMany({
    where: { rebookReminderSentAt: { gte: since } },
    include: { service: { select: { name: true } } },
  });
  if (sent.length === 0) return [];
  const earliestVisit = sent.map((b) => b.date).sort()[0];
  // Phones are stored as typed ("07…", "+44 7…"), so match customers in code rather than in the query.
  const history = await prisma.booking.findMany({
    where: { OR: [{ date: { gt: earliestVisit } }, { createdAt: { gte: since } }] },
    select: {
      date: true,
      customerEmail: true,
      customerPhone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      customerCancelledAt: true,
    },
  });
  return checkSentReminders(
    sent.map((b) => ({ ...b, serviceName: b.service.name, rebookReminderSentAt: b.rebookReminderSentAt! })),
    history
  );
}
