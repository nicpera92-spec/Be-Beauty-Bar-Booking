import { format, parse } from "date-fns";

/** Format amount as £X.XX */
export function formatCurrency(amount: number): string {
  return "£" + Number(amount).toFixed(2);
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
