import { addDays, format, isBefore, parse, startOfDay } from "date-fns";
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
  const result = await prisma.waitingListEntry.updateMany({
    where: {
      status: "active",
      preferredDate: { lt: today },
    },
    data: { status: "expired" },
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

async function alreadyNotifiedForSlot(
  entryId: string,
  date: string,
  startTime: string
) {
  const entry = await prisma.waitingListEntry.findUnique({ where: { id: entryId } });
  if (!entry) return true;
  return entry.notifiedSlotDate === date && entry.notifiedSlotTime === startTime;
}

export async function notifyWaitlistEntryForSlot(
  entryId: string,
  slot: OpenSlot
): Promise<{ ok: boolean; error?: string }> {
  if (!isWaitlistSlotStillBookable(slot.date, slot.startTime)) {
    return { ok: true };
  }

  if (await alreadyNotifiedForSlot(entryId, slot.date, slot.startTime)) {
    return { ok: true };
  }

  const entry = await prisma.waitingListEntry.findUnique({
    where: { id: entryId },
    include: { service: true, technician: true },
  });
  if (!entry || entry.status !== "active") return { ok: false, error: "Entry not active" };

  const bookable = await isSlotBookableForService(
    entry.serviceId,
    entry.technicianId,
    slot
  );
  if (!bookable) {
    return { ok: true };
  }

  const result = await (await import("@/lib/email")).sendWaitlistNotification({
    entry,
    slot,
    serviceName: entry.service.name,
    technicianName: entry.technician.name,
  });

  if (result.ok) {
    await prisma.waitingListEntry.update({
      where: { id: entryId },
      data: {
        lastNotifiedAt: new Date(),
        notifiedSlotDate: slot.date,
        notifiedSlotTime: slot.startTime,
      },
    });
  }

  return result;
}

export async function notifyWaitlistForFreedSlot(params: {
  /** Cancelled booking's service — used only by callers; all waitlist services for this tech are checked. */
  serviceId: string;
  technicianId: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<void> {
  if (!(await isWaitlistEnabled())) return;

  const { technicianId, date, startTime, endTime } = params;
  const today = todayStr();
  if (date < today) return;

  const entries = await prisma.waitingListEntry.findMany({
    where: {
      technicianId,
      status: "active",
      preferredDate: { gte: today },
      OR: [{ preferredDate: date }, { notifyEarliest: true }],
    },
  });

  for (const entry of entries) {
    const wantsThisDay = entry.preferredDate === date;
    const wantsEarlier =
      entry.notifyEarliest && entry.preferredDate >= date && date <= entry.preferredDate;
    if (!wantsThisDay && !wantsEarlier) continue;

    const bookableSlots = await findBookableSlotsAfterCancellation(
      entry.serviceId,
      technicianId,
      date,
      startTime,
      endTime
    );

    for (const slot of bookableSlots) {
      await notifyWaitlistEntryForSlot(entry.id, slot);
    }
  }
}

export async function processEarliestWaitlistNotifications(): Promise<{
  notified: number;
  expired: number;
}> {
  if (!(await isWaitlistEnabled())) {
    const expired = await expirePastWaitlistEntries();
    return { notified: 0, expired };
  }

  const expired = await expirePastWaitlistEntries();
  const today = todayStr();

  const entries = await prisma.waitingListEntry.findMany({
    where: {
      status: "active",
      notifyEarliest: true,
      preferredDate: { gte: today },
    },
  });

  let notified = 0;
  for (const entry of entries) {
    const slot = await findEarliestOpenSlot(
      entry.serviceId,
      entry.technicianId,
      entry.preferredDate
    );
    if (!slot) continue;
    if (!isWaitlistSlotStillBookable(slot.date, slot.startTime)) continue;

    const wasNotified =
      entry.notifiedSlotDate === slot.date && entry.notifiedSlotTime === slot.startTime;
    if (wasNotified) continue;

    const result = await notifyWaitlistEntryForSlot(entry.id, slot);
    if (result.ok) notified++;
  }

  return { notified, expired };
}
