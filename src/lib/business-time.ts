import { formatInTimeZone } from "date-fns-tz";

/** Salon operates in the UK — use for “today” in waitlist and same-day booking rules. */
export const BUSINESS_TIMEZONE = "Europe/London";

export function businessDateStr(at: Date = new Date()): string {
  return formatInTimeZone(at, BUSINESS_TIMEZONE, "yyyy-MM-dd");
}
