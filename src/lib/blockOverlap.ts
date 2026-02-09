import { parse } from "date-fns";

export function toDate(dateStr: string, timeStr: string): Date {
  return parse(`${dateStr}T${timeStr}`, "yyyy-MM-dd'T'HH:mm", new Date());
}

export function rangesOverlap(
  aDate: string,
  aStart: string,
  aEnd: string,
  bStartDate: string,
  bStartTime: string,
  bEndDate: string,
  bEndTime: string
): boolean {
  const aStartDt = toDate(aDate, aStart);
  const aEndDt = toDate(aDate, aEnd);
  const bStartDt = toDate(bStartDate, bStartTime);
  const bEndDt = toDate(bEndDate, bEndTime);
  return aStartDt < bEndDt && aEndDt > bStartDt;
}

export function blockOverlapsBooking(
  blockStartDate: string,
  blockStartTime: string,
  blockEndDate: string,
  blockEndTime: string,
  bookingDate: string,
  bookingStartTime: string,
  bookingEndTime: string
): boolean {
  return rangesOverlap(
    bookingDate,
    bookingStartTime,
    bookingEndTime,
    blockStartDate,
    blockStartTime,
    blockEndDate,
    blockEndTime
  );
}

export function blockOverlapsSlot(
  blockStartDate: string,
  blockStartTime: string,
  blockEndDate: string,
  blockEndTime: string,
  slotDate: string,
  slotStart: string,
  slotEnd: string
): boolean {
  return rangesOverlap(
    slotDate,
    slotStart,
    slotEnd,
    blockStartDate,
    blockStartTime,
    blockEndDate,
    blockEndTime
  );
}
