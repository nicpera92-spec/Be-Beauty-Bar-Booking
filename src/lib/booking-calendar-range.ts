import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfMonth,
  startOfToday,
} from "date-fns";

/** Same date range as the customer “choose a date” booking page. */
export function getCustomerBookableRange() {
  const today = startOfToday();
  // Earliest customer date is the day after tomorrow (today and tomorrow are blocked).
  const minBookableDate = addDays(today, 2);
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
  };
}
