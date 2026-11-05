import { parse } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSlotsForDay } from "@/lib/slotUtils";
import {
  getCategoryCapacityRules,
  getCategoryExclusionPairs,
  maxConcurrentFromRules,
} from "@/lib/bookingAvailability";
import { hasWaitlistSameDayBookingAccess } from "@/lib/waitlist-booking-token";
import { isBeforeMinBookableDate } from "@/lib/business-time";
import { resolveHoursForDate } from "@/lib/workingHours";

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
