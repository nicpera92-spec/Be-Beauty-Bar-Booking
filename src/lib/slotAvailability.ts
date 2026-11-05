import { addDays, format, parse } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSlotsForDay } from "@/lib/slotUtils";
import {
  getCategoryCapacityRules,
  getCategoryExclusionPairs,
  maxConcurrentFromRules,
} from "@/lib/bookingAvailability";
import { hasWaitlistSameDayBookingAccess } from "@/lib/waitlist-booking-token";
import { businessDateStr, isBeforeMinBookableDate } from "@/lib/business-time";
import { resolveHoursForDate } from "@/lib/workingHours";

export type RangeAvailabilityResult =
  | { ok: true; availability: Record<string, boolean> }
  | { ok: false; status: number; error: string };

/**
 * Which days in [from, to] have at least one bookable slot — the booking calendar's view.
 * excludeBookingId ignores one booking; skipSlot treats that one time as unavailable (its own current slot).
 */
export async function getAvailabilityForRange(params: {
  serviceId: string;
  technicianId: string;
  from: string;
  to: string;
  waitlistToken?: string | null;
  excludeBookingId?: string;
  skipSlot?: { date: string; startTime: string };
}): Promise<RangeAvailabilityResult> {
  const { serviceId, technicianId, from, to } = params;
  const now = new Date();
  const businessToday = businessDateStr(now);
  const [service, settings, bookings, blocks, capacityRules, exclusionPairs, sameDayWaitlistAccess] =
    await Promise.all([
      prisma.service.findUnique({
        where: { id: serviceId },
        include: { technician: { select: { active: true, workingHours: true } } },
      }),
      prisma.businessSettings.findUnique({
        where: { id: "default" },
        select: { openTime: true, closeTime: true, slotInterval: true },
      }),
      prisma.booking.findMany({
        where: {
          date: { gte: from, lte: to },
          status: { not: "cancelled" },
          ...(params.excludeBookingId ? { id: { not: params.excludeBookingId } } : {}),
        },
        select: {
          date: true,
          technicianId: true,
          startTime: true,
          endTime: true,
          service: { select: { category: true } },
        },
      }),
      prisma.availabilityBlock.findMany({
        where: { startDate: { lte: to }, endDate: { gte: from }, technicianId },
      }),
      getCategoryCapacityRules(),
      getCategoryExclusionPairs(),
      params.waitlistToken
        ? hasWaitlistSameDayBookingAccess(params.waitlistToken, { date: businessToday, serviceId, technicianId })
        : Promise.resolve(false),
    ]);
  if (!service) return { ok: false, status: 404, error: "Service not found" };
  if (service.technicianId !== technicianId) {
    return { ok: false, status: 400, error: "Service does not match technician" };
  }

  const fromDate = parse(from, "yyyy-MM-dd", new Date());
  const toDate = parse(to, "yyyy-MM-dd", new Date());
  const numDays = Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const availability: Record<string, boolean> = {};

  // Technician not bookable → no open days, mirroring the per-day slots check.
  if (!service.technician?.active) {
    for (let i = 0; i < numDays; i++) availability[format(addDays(fromDate, i), "yyyy-MM-dd")] = false;
    return { ok: true, availability };
  }

  const maxConcurrent = maxConcurrentFromRules(capacityRules, service.category);
  const s = settings ?? { openTime: "09:00", closeTime: "17:00", slotInterval: 30 };

  for (let i = 0; i < numDays; i++) {
    const dateStr = format(addDays(fromDate, i), "yyyy-MM-dd");
    const allowSameDayWaitlist = sameDayWaitlistAccess && dateStr === businessToday;
    if (!allowSameDayWaitlist && isBeforeMinBookableDate(dateStr, now)) {
      availability[dateStr] = false;
      continue;
    }
    const dayHours = resolveHoursForDate(dateStr, service.technician.workingHours, s.openTime, s.closeTime);
    if (dayHours.isOff) {
      availability[dateStr] = false;
      continue;
    }
    const dayBookings = bookings.filter((b) => b.date === dateStr);
    const slots = getSlotsForDay(
      dateStr,
      parse(dateStr, "yyyy-MM-dd", new Date()),
      dayHours.openTime,
      dayHours.closeTime,
      s.slotInterval,
      service.durationMin,
      [],
      blocks.filter((b) => b.startDate <= dateStr && b.endDate >= dateStr),
      now,
      {
        technicianBookings: dayBookings
          .filter((b) => b.technicianId === technicianId)
          .map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
        categoryBookings: dayBookings.map((b) => ({
          startTime: b.startTime,
          endTime: b.endTime,
          service: { category: b.service.category },
        })),
        serviceCategory: service.category,
        maxConcurrentInCategory: maxConcurrent,
        exclusionPairs,
      }
    );
    const usable =
      params.skipSlot && params.skipSlot.date === dateStr
        ? slots.filter((slot) => slot.start !== params.skipSlot!.startTime)
        : slots;
    availability[dateStr] = usable.length > 0;
  }
  return { ok: true, availability };
}

export type DaySlotsResult =
  | { ok: true; slots: { start: string; end: string }[] }
  | { ok: false; status: number; error: string };

/**
 * Bookable slots for one service on one day — the same rules customers see on the booking page.
 * excludeBookingId ignores one existing booking (used when that booking is being moved).
 */
export async function getAvailableSlotsForDay(params: {
  date: string;
  serviceId: string;
  technicianId: string;
  waitlistToken?: string | null;
  excludeBookingId?: string;
}): Promise<DaySlotsResult> {
  const { date, serviceId, technicianId } = params;
  const [service, sameDayWaitlistAccess, settings, dayBookings, blocks, capacityRules, exclusionPairs] =
    await Promise.all([
      prisma.service.findUnique({
        where: { id: serviceId },
        include: { technician: { select: { id: true, active: true, workingHours: true } } },
      }),
      hasWaitlistSameDayBookingAccess(params.waitlistToken, { date, serviceId, technicianId }),
      prisma.businessSettings.findUnique({
        where: { id: "default" },
        select: { openTime: true, closeTime: true, slotInterval: true },
      }),
      prisma.booking.findMany({
        where: {
          date,
          status: { not: "cancelled" },
          ...(params.excludeBookingId ? { id: { not: params.excludeBookingId } } : {}),
        },
        select: {
          technicianId: true,
          startTime: true,
          endTime: true,
          service: { select: { category: true } },
        },
      }),
      prisma.availabilityBlock.findMany({
        where: {
          startDate: { lte: date },
          endDate: { gte: date },
          technicianId,
        },
      }),
      getCategoryCapacityRules(),
      getCategoryExclusionPairs(),
    ]);

  if (!service) return { ok: false, status: 404, error: "Service not found" };
  if (service.technicianId !== technicianId) {
    return { ok: false, status: 400, error: "This service does not belong to the selected technician" };
  }
  if (!service.technician?.active) {
    return { ok: false, status: 400, error: "Technician is not available" };
  }

  if (!sameDayWaitlistAccess && isBeforeMinBookableDate(date)) return { ok: true, slots: [] };

  const s = settings ?? { openTime: "09:00", closeTime: "17:00", slotInterval: 30 };
  const dayHours = resolveHoursForDate(date, service.technician.workingHours, s.openTime, s.closeTime);
  if (dayHours.isOff) return { ok: true, slots: [] };

  const slots = getSlotsForDay(
    date,
    parse(date, "yyyy-MM-dd", new Date()),
    dayHours.openTime,
    dayHours.closeTime,
    s.slotInterval,
    service.durationMin,
    [],
    blocks,
    new Date(),
    {
      technicianBookings: dayBookings
        .filter((b) => b.technicianId === technicianId)
        .map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
      categoryBookings: dayBookings.map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
        service: { category: b.service.category },
      })),
      serviceCategory: service.category,
      maxConcurrentInCategory: maxConcurrentFromRules(capacityRules, service.category),
      exclusionPairs,
    }
  );
  return { ok: true, slots };
}
