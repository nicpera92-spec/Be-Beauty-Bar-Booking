import {
  addMinutes,
  format,
  parse,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
  isSameDay,
} from "date-fns";
import { blockOverlapsSlot } from "@/lib/blockOverlap";

type BookingSlot = { startTime: string; endTime: string };
type Block = { startDate: string; startTime: string; endDate: string; endTime: string };

/**
 * Get available slots for a single day given settings, bookings, and blocks.
 */
export function getSlotsForDay(
  dateStr: string,
  day: Date,
  openHour: number,
  closeHour: number,
  interval: number,
  duration: number,
  existingBookings: BookingSlot[],
  blocks: Block[],
  now: Date
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const open = setMinutes(setHours(day, openHour), 0);
  const close = setMinutes(setHours(day, closeHour), 0);
  let cursor = open;

  while (true) {
    const end = addMinutes(cursor, duration);
    if (isAfter(end, close)) break;

    const startStr = format(cursor, "HH:mm");
    const endStr = format(end, "HH:mm");

    const overlapsBooking = existingBookings.some((b) => {
      const aStart = parse(b.startTime, "HH:mm", day);
      const aEnd = parse(b.endTime, "HH:mm", day);
      return (
        (isBefore(cursor, aEnd) && isAfter(end, aStart)) ||
        (isBefore(aStart, end) && isAfter(aEnd, cursor))
      );
    });

    const overlapsBlock = blocks.some((b) =>
      blockOverlapsSlot(b.startDate, b.startTime, b.endDate, b.endTime, dateStr, startStr, endStr)
    );

    const isPast = isSameDay(day, now) && isBefore(end, now);
    if (!overlapsBooking && !overlapsBlock && !isPast) {
      slots.push({ start: startStr, end: endStr });
    }

    cursor = addMinutes(cursor, interval);
  }

  return slots;
}
