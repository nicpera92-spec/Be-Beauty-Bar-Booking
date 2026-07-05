import { addDays, format, parse } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** Salon operates in the UK — use for “today” in waitlist and same-day booking rules. */
export const BUSINESS_TIMEZONE = "Europe/London";

export function businessDateStr(at: Date = new Date()): string {
  return formatInTimeZone(at, BUSINESS_TIMEZONE, "yyyy-MM-dd");
}

/** First date customers can normally book without a waitlist same-day token. */
export function businessTomorrowStr(at: Date = new Date()): string {
  const today = businessDateStr(at);
  return format(addDays(parse(today, "yyyy-MM-dd", new Date()), 1), "yyyy-MM-dd");
}

export function isBusinessToday(dateStr: string, at: Date = new Date()): boolean {
  return dateStr === businessDateStr(at);
}

/** True when date is today or earlier (not normally bookable without waitlist token). */
export function isBeforeMinBookableDate(dateStr: string, at: Date = new Date()): boolean {
  return dateStr < businessTomorrowStr(at);
}

/** End of the given calendar day in London, as a UTC instant (for JWT expiry). */
export function businessEndOfDayUtc(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T23:59:59.999`, BUSINESS_TIMEZONE);
}
