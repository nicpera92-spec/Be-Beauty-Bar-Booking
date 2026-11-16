import { addDays, format, parse } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  resolveBookingLeadSettings,
  type BookingLeadSettings,
} from "@/lib/bookingLeadPolicy";

/** Salon operates in the UK — use for “today” in waitlist and same-day booking rules. */
export const BUSINESS_TIMEZONE = "Europe/London";

export function businessDateStr(at: Date = new Date()): string {
  return formatInTimeZone(at, BUSINESS_TIMEZONE, "yyyy-MM-dd");
}

/** Current clock time in the salon timezone as HH:mm. */
export function businessTimeStr(at: Date = new Date()): string {
  return formatInTimeZone(at, BUSINESS_TIMEZONE, "HH:mm");
}

/** Calendar tomorrow in the salon timezone. */
export function businessTomorrowStr(at: Date = new Date()): string {
  const today = businessDateStr(at);
  return format(addDays(parse(today, "yyyy-MM-dd", new Date()), 1), "yyyy-MM-dd");
}

/**
 * First date customers can normally book.
 * Before the cut-off: today + minAdvanceDays.
 * At/after the cut-off: today + minAdvanceDays + 1.
 * Waitlist same-day tokens can still unlock today.
 */
export function businessMinBookableDateStr(
  at: Date = new Date(),
  lead?: Partial<BookingLeadSettings> | null
): string {
  const settings = resolveBookingLeadSettings(lead);
  const today = businessDateStr(at);
  const pastCutoff = businessTimeStr(at) >= settings.cutoffTime;
  const days = settings.minAdvanceDays + (pastCutoff ? 1 : 0);
  return format(addDays(parse(today, "yyyy-MM-dd", new Date()), days), "yyyy-MM-dd");
}

export function isBusinessToday(dateStr: string, at: Date = new Date()): boolean {
  return dateStr === businessDateStr(at);
}

/** True when date is before the normal minimum bookable day (waitlist same-day token excepted). */
export function isBeforeMinBookableDate(
  dateStr: string,
  at: Date = new Date(),
  lead?: Partial<BookingLeadSettings> | null
): boolean {
  return dateStr < businessMinBookableDateStr(at, lead);
}

/** A UK appointment time (date + "HH:mm") as a UTC instant. */
export function appointmentStartUtc(date: string, time: string): Date {
  const [h, m] = time.split(":");
  return fromZonedTime(`${date}T${h.padStart(2, "0")}:${m}:00`, BUSINESS_TIMEZONE);
}

/** End of the given calendar day in London, as a UTC instant (for JWT expiry). */
export function businessEndOfDayUtc(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T23:59:59.999`, BUSINESS_TIMEZONE);
}
