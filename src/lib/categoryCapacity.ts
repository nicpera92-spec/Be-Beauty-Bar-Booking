import { isAfter, isBefore, parse } from "date-fns";

export type TimedBooking = {
  startTime: string;
  endTime: string;
  service: { category: string };
};

/** True if two time ranges overlap on the same calendar day. */
export function timeRangesOverlap(
  day: Date,
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = parse(startA, "HH:mm", day);
  const aEnd = parse(endA, "HH:mm", day);
  const bStart = parse(startB, "HH:mm", day);
  const bEnd = parse(endB, "HH:mm", day);
  return isBefore(aStart, bEnd) && isAfter(aEnd, bStart);
}

/** Count bookings in a category that overlap a candidate slot. */
export function countCategoryOverlaps(
  bookings: TimedBooking[],
  category: string,
  day: Date,
  slotStart: string,
  slotEnd: string
): number {
  return bookings.filter(
    (b) =>
      b.service.category === category &&
      timeRangesOverlap(day, slotStart, slotEnd, b.startTime, b.endTime)
  ).length;
}

export const DEFAULT_CATEGORY_RULES: { category: string; maxConcurrent: number }[] = [
  { category: "nails", maxConcurrent: 1 },
  { category: "lash", maxConcurrent: 2 },
  { category: "permanent-makeup", maxConcurrent: 1 },
];

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    nails: "Nails",
    lash: "Lash extensions",
    "permanent-makeup": "Permanent makeup",
  };
  return labels[category] ?? category.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
