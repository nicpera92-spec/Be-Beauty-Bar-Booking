import {
  addMinutes,
  format,
  parse,
  isBefore,
  isAfter,
  isSameDay,
} from "date-fns";
import { blockOverlapsSlot } from "@/lib/blockOverlap";
import {
  countCategoryOverlaps,
  hasExcludedCategoryOverlap,
  type CategoryExclusionPair,
  type TimedBooking,
} from "@/lib/categoryCapacity";

type BookingSlot = { startTime: string; endTime: string };
type Block = { startDate: string; startTime: string; endDate: string; endTime: string };

export type SlotRuleOptions = {
  /** This technician's existing bookings (any category). */
  technicianBookings: BookingSlot[];
  /** All active bookings on this day with service category (for capacity rules). */
  categoryBookings: TimedBooking[];
  serviceCategory: string;
  maxConcurrentInCategory: number;
  /** Category pairs that must not overlap (e.g. lash vs pedicure). */
  exclusionPairs?: CategoryExclusionPair[];
};

/**
 * Get available slots for a single day given settings, bookings, blocks, and optional capacity rules.
 */
export function getSlotsForDay(
  dateStr: string,
  day: Date,
  openTime: string,
  closeTime: string,
  interval: number,
  duration: number,
  existingBookings: BookingSlot[],
  blocks: Block[],
  now: Date,
  rules?: SlotRuleOptions
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const open = parse(openTime, "HH:mm", day);
  const close = parse(closeTime, "HH:mm", day);
  let cursor = open;

  const techBookings = rules?.technicianBookings ?? existingBookings;
  const useCategoryRules = Boolean(rules);

  while (true) {
    const end = addMinutes(cursor, duration);
    if (isAfter(end, close)) break;

    const startStr = format(cursor, "HH:mm");
    const endStr = format(end, "HH:mm");

    const overlapsTechnician = techBookings.some((b) => {
      const aStart = parse(b.startTime, "HH:mm", day);
      const aEnd = parse(b.endTime, "HH:mm", day);
      return (
        (isBefore(cursor, aEnd) && isAfter(end, aStart)) ||
        (isBefore(aStart, end) && isAfter(aEnd, cursor))
      );
    });

    let blockedByCategory = false;
    if (useCategoryRules && rules) {
      const overlaps = countCategoryOverlaps(
        rules.categoryBookings,
        rules.serviceCategory,
        day,
        startStr,
        endStr
      );
      const excluded = hasExcludedCategoryOverlap(
        rules.categoryBookings,
        rules.serviceCategory,
        day,
        startStr,
        endStr,
        rules.exclusionPairs ?? []
      );
      blockedByCategory = overlaps >= rules.maxConcurrentInCategory || excluded;
    } else if (!useCategoryRules) {
      const overlapsBooking = existingBookings.some((b) => {
        const aStart = parse(b.startTime, "HH:mm", day);
        const aEnd = parse(b.endTime, "HH:mm", day);
        return (
          (isBefore(cursor, aEnd) && isAfter(end, aStart)) ||
          (isBefore(aStart, end) && isAfter(aEnd, cursor))
        );
      });
      blockedByCategory = overlapsBooking;
    }

    const overlapsBlock = blocks.some((b) =>
      blockOverlapsSlot(b.startDate, b.startTime, b.endDate, b.endTime, dateStr, startStr, endStr)
    );

    const isPast = isSameDay(day, now) && isBefore(end, now);
    const blocked = overlapsTechnician || blockedByCategory || overlapsBlock || isPast;

    if (!blocked) {
      slots.push({ start: startStr, end: endStr });
    }

    cursor = addMinutes(cursor, interval);
  }

  return slots;
}
