import { addDays, format, parse } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** Salon operates in the UK — use for “today” in waitlist and same-day booking rules. */
export const BUSINESS_TIMEZONE = "Europe/London";

/** Customers must book at least this far ahead of the appointment start (waitlist same-day links excepted). */
export const MIN_BOOKING_LEAD_HOURS = 24;

export function businessDateStr(at: Date = new Date()): string {
  return formatInTimeZone(at, BUSINESS_TIMEZONE, "yyyy-MM-dd");
}

/** Calendar tomorrow in the salon timezone. */
export function businessTomorrowStr(at: Date = new Date()): string {
  const today = businessDateStr(at);
  return format(addDays(parse(today, "yyyy-MM-dd", new Date()), 1), "yyyy-MM-dd");
}

/**
 * First date customers can normally book (day after tomorrow).
 * Today and tomorrow are blocked unless they have a waitlist same-day token.
 */
export function businessMinBookableDateStr(at: Date = new Date()): string {
  const today = businessDateStr(at);
  return format(addDays(parse(today, "yyyy-MM-dd", new Date()), 2), "yyyy-MM-dd");
}

export function isBusinessToday(dateStr: string, at: Date = new Date()): boolean {
  return dateStr === businessDateStr(at);
}

/** True when date is before the normal minimum bookable day (waitlist same-day token excepted). */
export function isBeforeMinBookableDate(dateStr: string, at: Date = new Date()): boolean {
  return dateStr < businessMinBookableDateStr(at);
}

/** A UK appointment time (date + "HH:mm") as a UTC instant. */
export function appointmentStartUtc(date: string, time: string): Date {
  const [h, m] = time.split(":");
  return fromZonedTime(`${date}T${h.padStart(2, "0")}:${m}:00`, BUSINESS_TIMEZONE);
}

/** True when the appointment starts sooner than the minimum lead time. */
export function isAppointmentTooSoon(
  date: string,
  startTime: string,
  at: Date = new Date(),
  leadHours: number = MIN_BOOKING_LEAD_HOURS
): boolean {
  const start = appointmentStartUtc(date, startTime);
  return start.getTime() - at.getTime() < leadHours * 60 * 60 * 1000;
}

/** End of the given calendar day in London, as a UTC instant (for JWT expiry). */
export function businessEndOfDayUtc(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T23:59:59.999`, BUSINESS_TIMEZONE);
}
