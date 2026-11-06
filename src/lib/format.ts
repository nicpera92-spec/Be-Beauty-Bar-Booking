import { format, parse } from "date-fns";

/** Format amount as £X.XX */
export function formatCurrency(amount: number): string {
  return "£" + Number(amount).toFixed(2);
}

/** Format price for service display: £50 for whole numbers, £12.50 for decimals */
export function formatPriceShort(amount: number): string {
  const n = Number(amount);
  return "£" + (Number.isInteger(n) ? n.toString() : n.toFixed(2));
}

/** Format duration in minutes as hours: 120 → "2h", 90 → "1h 30m", 45 → "45m" */
export function formatDurationHours(minutes: number): string {
  const m = Number(minutes);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remainder = m % 60;
    return remainder === 0 ? `${h}h` : `${h}h ${remainder}m`;
  }
  return `${m}m`;
}

/** Format booking date as "June 20th" */
export function formatBookingDateFriendly(dateStr: string): string {
  return formatBookingDate(dateStr, "MMMM do");
}

/** When something happened, in UK time: "Fri 6 Nov 2026, 12:31". */
export function formatMadeAt(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")}`;
}

/** Format date string (yyyy-MM-dd) for display; returns dateStr on parse error */
export function formatBookingDate(dateStr: string, formatStr: string): string {
  try {
    const d = parse(dateStr, "yyyy-MM-dd", new Date());
    return format(d, formatStr);
  } catch {
    return dateStr;
  }
}
