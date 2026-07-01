import { addDays, eachDayOfInterval, format, isBefore, parse, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSlotsForDay } from "@/lib/slotUtils";
import { getMaxConcurrentForCategory } from "@/lib/bookingAvailability";

export type OpenSlot = {
  date: string;
  startTime: string;
  endTime: string;
};

function todayStr(at: Date = new Date()) {
  return format(startOfDay(at), "yyyy-MM-dd");
}

/** True when customers can still book this slot (date in future, or same day before start time). */
export function isWaitlistSlotStillBookable(
  date: string,
  startTime: string,
  at: Date = new Date()
): boolean {
  const today = todayStr(at);
  if (date < today) return false;
  if (date > today) return true;

  const slotStart = parse(`${date} ${startTime}`, "yyyy-MM-dd HH:mm", at);
  return !isBefore(slotStart, at);
}

export async function isWaitlistEnabled(): Promise<boolean> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { waitlistEnabled: true },
  });
  return settings?.waitlistEnabled ?? true;
}

export async function expirePastWaitlistEntries(): Promise<number> {
  const today = todayStr();
  const active = await prisma.waitingListEntry.findMany({
    where: { status: "active" },
    select: { id: true, preferredDate: true, preferredDateEnd: true, notifyEarliest: true },
  });
  const expiredIds = active
    .filter((entry) => waitlistRangeEnd(entry) < today)
    .map((entry) => entry.id);
  if (expiredIds.length === 0) return 0;
  const result = await prisma.waitingListEntry.updateMany({
    where: { id: { in: expiredIds } },
    data: { status: "expired" },
  });
  return result.count;
}

/** True when a booking on bookingDate satisfies this waitlist entry. */
export function waitlistEntryFulfilledByBooking(
  entry: WaitlistDatePreference,
  bookingDate: string
): boolean {
  return waitlistEntryInterestedInDate(entry, bookingDate);
}

export type WaitlistDatePreference = {
  preferredDate: string;
  preferredDateEnd: string | null;
  notifyEarliest: boolean;
};

/** Inclusive end of the customer's requested date range. */
export function waitlistRangeEnd(entry: WaitlistDatePreference): string {
  if (entry.preferredDateEnd && entry.preferredDateEnd >= entry.preferredDate) {
    return entry.preferredDateEnd;
  }
  return entry.preferredDate;
}

export function waitlistHasExplicitRange(entry: WaitlistDatePreference): boolean {
  return Boolean(entry.preferredDateEnd && entry.preferredDateEnd > entry.preferredDate);
}

/** First date to scan when looking for open slots for this entry. */
export function waitlistNotificationSearchStart(
  entry: WaitlistDatePreference,
  today: string
): string {
  if (entry.notifyEarliest && !waitlistHasExplicitRange(entry)) {
    return today;
  }
  return entry.preferredDate > today ? entry.preferredDate : today;
}

/** True when an open slot on date is relevant to this waitlist entry. */
export function waitlistEntryInterestedInDate(
  entry: WaitlistDatePreference,
  date: string
): boolean {
  const end = waitlistRangeEnd(entry);
  const start = entry.preferredDate;

  if (waitlistHasExplicitRange(entry)) {
    return date >= start && date <= end;
  }

  if (date === start) return true;
  if (entry.notifyEarliest && date < start) return true;
  return false;
}

/** Merge two waitlist sign-ups from the same customer into one preference. */
export function mergeWaitlistPreferences(
  a: WaitlistDatePreference,
  b: WaitlistDatePreference
): WaitlistDatePreference {
  const endA = waitlistRangeEnd(a);
  const endB = waitlistRangeEnd(b);
  const start = a.preferredDate <= b.preferredDate ? a.preferredDate : b.preferredDate;
  const end = endA >= endB ? endA : endB;
  const hasRange = end > start;
  return {
    preferredDate: start,
    preferredDateEnd: hasRange ? end : null,
    notifyEarliest: !hasRange && (a.notifyEarliest || b.notifyEarliest),
  };
}

/** Human-readable waitlist date range for admin and confirmations. */
export function formatWaitlistDateRange(
  entry: WaitlistDatePreference,
  formatDate: (dateStr: string) => string
): string {
  if (waitlistHasExplicitRange(entry)) {
    return `${formatDate(entry.preferredDate)} – ${formatDate(waitlistRangeEnd(entry))}`;
  }
  if (entry.notifyEarliest) {
    return `${formatDate(entry.preferredDate)} · earlier dates too`;
  }
  return formatDate(entry.preferredDate);
}

function waitlistContactOr(customerEmail: string | null, customerPhone: string | null) {
  const email = customerEmail?.trim() || "";
  const phone = customerPhone?.trim() || "";
  const contactOr: Array<{ customerEmail: string } | { customerPhone: string }> = [];
  if (email) contactOr.push({ customerEmail: email });
  if (phone) contactOr.push({ customerPhone: phone });
  return contactOr;
}

/** Remove waitlist entries once the customer has booked on their date (or earlier if opted in). */
export async function removeWaitlistEntriesAfterBooking(params: {
  serviceId: string;
  technicianId: string;
  customerEmail: string | null;
  customerPhone: string | null;
  date: string;
}): Promise<number> {
  const { serviceId, technicianId, customerEmail, customerPhone, date } = params;
  const email = customerEmail?.trim() || "";
  const phone = customerPhone?.trim() || "";
  if (!email && !phone) return 0;

  const contactOr = waitlistContactOr(customerEmail, customerPhone);

  const entries = await prisma.waitingListEntry.findMany({
    where: {
      status: "active",
      serviceId,
      technicianId,
      OR: contactOr,
    },
  });

  const ids = entries
    .filter((entry) => waitlistEntryFulfilledByBooking(entry, date))
    .map((entry) => entry.id);

  if (ids.length === 0) return 0;

  const result = await prisma.waitingListEntry.updateMany({
    where: { id: { in: ids } },
    data: { status: "fulfilled" },
  });
  return result.count;
}

async function loadDayContext(
  serviceId: string,
  technicianId: string,
  dateStr: string
) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { technician: { select: { active: true, name: true } } },
  });
  if (!service || !service.technician?.active) return null;

  const [settings, dayBookings, blocks, maxConcurrent] = await Promise.all([
    prisma.businessSettings.findUnique({ where: { id: "default" } }),
    prisma.booking.findMany({
      where: { date: dateStr, status: { not: "cancelled" } },
      select: {
        technicianId: true,
        startTime: true,
        endTime: true,
        service: { select: { category: true } },
      },
    }),
    prisma.availabilityBlock.findMany({
      where: {
        technicianId,
        startDate: { lte: dateStr },
        endDate: { gte: dateStr },
      },
    }),
    getMaxConcurrentForCategory(service.category),
  ]);

  const s = settings ?? { openTime: "09:00", closeTime: "17:00", slotInterval: 30 };
  const day = parse(dateStr, "yyyy-MM-dd", new Date());
  const technicianBookings = dayBookings
    .filter((b) => b.technicianId === technicianId)
    .map((b) => ({ startTime: b.startTime, endTime: b.endTime }));
  const categoryBookings = dayBookings.map((b) => ({
    startTime: b.startTime,
    endTime: b.endTime,
    service: { category: b.service.category },
  }));

  const slots = getSlotsForDay(
    dateStr,
    day,
    s.openTime,
    s.closeTime,
    s.slotInterval,
    service.durationMin,
    [],
    blocks,
    new Date(),
    {
      technicianBookings,
      categoryBookings,
      serviceCategory: service.category,
      maxConcurrentInCategory: maxConcurrent,
    }
  );

  return { service, slots };
}

/** Slots on this date that fit the service duration and start within the cancelled booking window. */
export function slotsFreedByCancellation(
  date: string,
  availableSlots: { start: string; end: string }[],
  cancelledStartTime: string,
  cancelledEndTime: string,
  at?: Date
): OpenSlot[] {
  return availableSlots
    .filter((slot) => slot.start >= cancelledStartTime && slot.start < cancelledEndTime)
    .filter((slot) => isWaitlistSlotStillBookable(date, slot.start, at))
    .map((slot) => ({
      date,
      startTime: slot.start,
      endTime: slot.end,
    }));
}

export async function findBookableSlotsAfterCancellation(
  serviceId: string,
  technicianId: string,
  date: string,
  cancelledStartTime: string,
  cancelledEndTime: string
): Promise<OpenSlot[]> {
  const ctx = await loadDayContext(serviceId, technicianId, date);
  if (!ctx) return [];
  return slotsFreedByCancellation(
    date,
    ctx.slots,
    cancelledStartTime,
    cancelledEndTime
  );
}

export async function isSlotBookableForService(
  serviceId: string,
  technicianId: string,
  slot: OpenSlot
): Promise<boolean> {
  const ctx = await loadDayContext(serviceId, technicianId, slot.date);
  if (!ctx) return false;
  return ctx.slots.some((s) => s.start === slot.startTime && s.end === slot.endTime);
}

export async function findEarliestOpenSlot(
  serviceId: string,
  technicianId: string,
  beforeDateInclusive: string
): Promise<OpenSlot | null> {
  const today = todayStr();
  let cursor = parse(today, "yyyy-MM-dd", new Date());
  const end = parse(beforeDateInclusive, "yyyy-MM-dd", new Date());

  while (cursor <= end) {
    const dateStr = format(cursor, "yyyy-MM-dd");
    const ctx = await loadDayContext(serviceId, technicianId, dateStr);
    if (ctx && ctx.slots.length > 0) {
      const first = ctx.slots[0];
      return { date: dateStr, startTime: first.start, endTime: first.end };
    }
    cursor = addDays(cursor, 1);
  }
  return null;
}

/** Bookable slots on a specific date for this service (still in the future). */
export async function findOpenSlotsOnDate(
  serviceId: string,
  technicianId: string,
  date: string
): Promise<OpenSlot[]> {
  const ctx = await loadDayContext(serviceId, technicianId, date);
  if (!ctx) return [];
  return ctx.slots
    .filter((slot) => isWaitlistSlotStillBookable(date, slot.start))
    .map((slot) => ({
      date,
      startTime: slot.start,
      endTime: slot.end,
    }));
}

async function alreadyNotifiedForDate(entryId: string, date: string) {
  const entry = await prisma.waitingListEntry.findUnique({ where: { id: entryId } });
  if (!entry) return true;
  return entry.notifiedSlotDate === date;
}

async function markWaitlistEntriesNotifiedForDate(
  entryIds: string[],
  date: string
): Promise<void> {
  if (entryIds.length === 0) return;
  const now = new Date();
  await prisma.waitingListEntry.updateMany({
    where: { id: { in: entryIds } },
    data: {
      lastNotifiedAt: now,
      notifiedSlotDate: date,
      notifiedSlotTime: null,
    },
  });
}

async function siblingEntriesForContact(
  serviceId: string,
  technicianId: string,
  customerEmail: string | null,
  customerPhone: string | null
) {
  const contactOr = waitlistContactOr(customerEmail, customerPhone);
  if (contactOr.length === 0) return [];
  return prisma.waitingListEntry.findMany({
    where: {
      status: "active",
      serviceId,
      technicianId,
      OR: contactOr,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function notifyWaitlistEntryForDate(
  entryId: string,
  date: string
): Promise<{ ok: boolean; sent?: boolean; error?: string }> {
  const today = todayStr();
  if (date < today) return { ok: true, sent: false };

  if (await alreadyNotifiedForDate(entryId, date)) {
    return { ok: true, sent: false };
  }

  const entry = await prisma.waitingListEntry.findUnique({
    where: { id: entryId },
    include: { service: true, technician: true },
  });
  if (!entry || entry.status !== "active") {
    return { ok: false, error: "Entry not active" };
  }

  if (!waitlistEntryInterestedInDate(entry, date)) {
    return { ok: true, sent: false };
  }

  const siblings = await siblingEntriesForContact(
    entry.serviceId,
    entry.technicianId,
    entry.customerEmail,
    entry.customerPhone
  );
  const interestedSiblings = siblings.filter((s) => waitlistEntryInterestedInDate(s, date));
  const alreadyNotifiedSibling = interestedSiblings.find((s) => s.notifiedSlotDate === date);
  if (alreadyNotifiedSibling) {
    await markWaitlistEntriesNotifiedForDate(
      interestedSiblings.filter((s) => s.notifiedSlotDate !== date).map((s) => s.id),
      date
    );
    return { ok: true, sent: false };
  }

  const openSlots = await findOpenSlotsOnDate(entry.serviceId, entry.technicianId, date);
  if (openSlots.length === 0) {
    return { ok: true, sent: false };
  }

  const result = await (await import("@/lib/email")).sendWaitlistNotification({
    entry,
    date,
    serviceName: entry.service.name,
    technicianName: entry.technician.name,
  });

  if (result.ok) {
    await markWaitlistEntriesNotifiedForDate(
      interestedSiblings.map((s) => s.id),
      date
    );
    return { ok: true, sent: true };
  }

  return result;
}

/** Notify all waitlist customers for this technician when a date has open slots. */
export async function notifyWaitlistForTechnicianOnDate(
  technicianId: string,
  date: string
): Promise<number> {
  if (!(await isWaitlistEnabled())) return 0;

  const today = todayStr();
  if (date < today) return 0;

  const entries = await prisma.waitingListEntry.findMany({
    where: {
      technicianId,
      status: "active",
    },
  });

  let notified = 0;
  const notifiedContacts = new Set<string>();
  for (const entry of entries) {
    if (!waitlistEntryInterestedInDate(entry, date)) continue;

    const contactKey = `${entry.serviceId}:${entry.customerEmail ?? ""}:${entry.customerPhone ?? ""}`;
    if (notifiedContacts.has(contactKey)) continue;

    const result = await notifyWaitlistEntryForDate(entry.id, date);
    if (result.sent) {
      notified++;
      notifiedContacts.add(contactKey);
    } else if (result.error && result.error !== "Entry not active") {
      console.warn("waitlist date notify failed:", entry.id, result.error);
    }
  }

  return notified;
}

/** After time off is removed, notify waitlist for each affected day. */
export async function notifyWaitlistAfterTimeOffRemoved(
  technicianId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const today = todayStr();
  if (endDate < today) return;

  const rangeStart = startDate < today ? today : startDate;
  const start = parse(rangeStart, "yyyy-MM-dd", new Date());
  const end = parse(endDate, "yyyy-MM-dd", new Date());
  if (end < start) return;

  for (const day of eachDayOfInterval({ start, end })) {
    const dateStr = format(day, "yyyy-MM-dd");
    await notifyWaitlistForTechnicianOnDate(technicianId, dateStr);
  }
}

export async function notifyWaitlistForFreedSlot(params: {
  serviceId: string;
  technicianId: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<void> {
  await notifyWaitlistForTechnicianOnDate(params.technicianId, params.date);
}

export async function processEarliestWaitlistNotifications(): Promise<{
  notified: number;
  expired: number;
}> {
  const expired = await expirePastWaitlistEntries();
  const notified = await processActiveWaitlistNotifications();
  return { notified, expired };
}

async function notifyEntryForNextOpenDateInRange(
  entryId: string,
  entry: WaitlistDatePreference,
  today: string
): Promise<{ ok: boolean; sent?: boolean; error?: string }> {
  const end = waitlistRangeEnd(entry);
  if (end < today) return { ok: true, sent: false };

  let cursor = parse(waitlistNotificationSearchStart(entry, today), "yyyy-MM-dd", new Date());
  const endDay = parse(end, "yyyy-MM-dd", new Date());

  while (cursor <= endDay) {
    const dateStr = format(cursor, "yyyy-MM-dd");
    if (waitlistEntryInterestedInDate(entry, dateStr)) {
      const result = await notifyWaitlistEntryForDate(entryId, dateStr);
      if (result.sent) return result;
      if (result.error && result.error !== "Entry not active") return result;
    }
    cursor = addDays(cursor, 1);
  }

  return { ok: true, sent: false };
}

/** Scan each entry's date range for the next open day to notify about. */
export async function processActiveWaitlistNotifications(): Promise<number> {
  if (!(await isWaitlistEnabled())) return 0;

  const today = todayStr();
  const entries = await prisma.waitingListEntry.findMany({
    where: { status: "active" },
  });

  let notified = 0;
  const notifiedContacts = new Set<string>();
  for (const entry of entries) {
    if (waitlistRangeEnd(entry) < today) continue;

    const contactKey = `${entry.serviceId}:${entry.customerEmail ?? ""}:${entry.customerPhone ?? ""}`;
    if (notifiedContacts.has(contactKey)) continue;

    const result = await notifyEntryForNextOpenDateInRange(entry.id, entry, today);
    if (result.sent) {
      notified++;
      notifiedContacts.add(contactKey);
    } else if (result.error && result.error !== "Entry not active") {
      console.warn("waitlist range notify failed:", entry.id, result.error);
    }
  }

  return notified;
}

/** Notify customers waiting for a specific date when slots are open (runs on cron). */
export async function processPreferredDateWaitlistNotifications(): Promise<number> {
  return processActiveWaitlistNotifications();
}

export async function processWaitlistNotifications(): Promise<{
  notifiedEarliest: number;
  notifiedPreferredDate: number;
  expired: number;
}> {
  const expired = await expirePastWaitlistEntries();
  const notified = await processActiveWaitlistNotifications();
  return { notifiedEarliest: 0, notifiedPreferredDate: notified, expired };
}
