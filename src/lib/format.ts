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

/** Format date string (yyyy-MM-dd) for display; returns dateStr on parse error */
export function formatBookingDate(dateStr: string, formatStr: string): string {
  try {
    const d = parse(dateStr, "yyyy-MM-dd", new Date());
    return format(d, formatStr);
  } catch {
    return dateStr;
  }
}
