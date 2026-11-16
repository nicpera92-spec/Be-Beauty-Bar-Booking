import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parse,
  startOfMonth,
  startOfToday,
} from "date-fns";
import { businessMinBookableDateStr } from "@/lib/business-time";
import {
  resolveBookingLeadSettings,
  type BookingLeadSettings,
} from "@/lib/bookingLeadPolicy";

/** Same date range as the customer “choose a date” booking page. */
export function getCustomerBookableRange(lead?: Partial<BookingLeadSettings> | null) {
  const today = startOfToday();
  const settings = resolveBookingLeadSettings(lead);
  const minBookableDateStr = businessMinBookableDateStr(new Date(), settings);
  const minBookableDate = parse(minBookableDateStr, "yyyy-MM-dd", new Date());
  const rangeStart = startOfMonth(today);
  const daysLeftInCurrentMonth = differenceInCalendarDays(endOfMonth(today), today);
  const monthsAhead = daysLeftInCurrentMonth <= 14 ? 2 : 1;
  const rangeEnd = endOfMonth(addMonths(rangeStart, monthsAhead));

  const monthStarts: Date[] = [];
  for (let i = 0; i <= monthsAhead; i++) {
    monthStarts.push(addMonths(rangeStart, i));
  }

  return {
    today,
    minBookableDate,
    rangeStart,
    rangeEnd,
    monthsAhead,
    monthStarts,
    fromStr: format(minBookableDate, "yyyy-MM-dd"),
    toStr: format(rangeEnd, "yyyy-MM-dd"),
    lead: settings,
  };
}
