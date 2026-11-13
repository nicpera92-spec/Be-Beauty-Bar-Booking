import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  format,
  getDay,
  parse,
  subDays,
  subMonths,
} from "date-fns";

export type StatsBooking = {
  id: string;
  customerName?: string;
  date: string;
  startTime: string;
  status: string;
  servicePrice: number;
  depositAmount: number;
  balancePaidOnline: boolean;
  depositRefundedAt: Date | string | null;
  customerCancelledAt: Date | string | null;
  rescheduleCount: number;
  stripeDepositPaymentIntentId: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string;
  technicianName: string;
};

export type RankedRow = { label: string; count: number; revenue: number };

export type DashboardStats = {
  confirmed: number;
  pending: number;
  cancelled: number;
  cancelledByCustomer: number;
  cancellationRate: number;
  rescheduled: number;
  revenue: number;
  depositsTaken: number;
  depositsKept: number;
  refundedDeposits: number;
  averageBookingValue: number;
  newCustomers: number;
  returningCustomers: number;
  /** % of customers in the period who had been before. */
  repeatRate: number;
  /** Full price of appointments that were cancelled. */
  lostToCancellations: number;
  topServices: RankedRow[];
  topCustomers: RankedRow[];
  byTechnician: RankedRow[];
  byWeekday: { label: string; count: number }[];
  byHour: { label: string; count: number }[];
};

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const parseYmd = (s: string) => parse(s, "yyyy-MM-dd", new Date());

/** True when from is the 1st of a month and to is the last day of a month. */
function isWholeMonths(from: string, to: string): boolean {
  return from.endsWith("-01") && to === ymd(endOfMonth(parseYmd(to)));
}

/**
 * The period just before [from, to] to compare against: the same number of calendar
 * months for whole-month ranges (e.g. March → February), otherwise the same number of days.
 */
export function previousPeriod(from: string, to: string): { from: string; to: string } {
  const f = parseYmd(from);
  const t = parseYmd(to);
  if (isWholeMonths(from, to)) {
    const months = differenceInCalendarMonths(t, f) + 1;
    return { from: ymd(subMonths(f, months)), to: ymd(endOfMonth(subMonths(t, months))) };
  }
  const days = differenceInCalendarDays(t, f) + 1;
  return { from: ymd(subDays(f, days)), to: ymd(subDays(t, days)) };
}

export type YearOnYear = {
  year: number;
  months: { label: string; thisYear: number; lastYear: number }[];
  thisYearTotal: number;
  lastYearTotal: number;
};

/** Confirmed takings per calendar month for `year` and the year before. */
export function yearOnYear(rows: { date: string; servicePrice: number }[], year: number): YearOnYear {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const months = MONTHS.map((label) => ({ label, thisYear: 0, lastYear: 0 }));
  for (const r of rows) {
    const y = Number(r.date.slice(0, 4));
    const m = Number(r.date.slice(5, 7)) - 1;
    if (!months[m]) continue;
    if (y === year) months[m].thisYear += r.servicePrice;
    else if (y === year - 1) months[m].lastYear += r.servicePrice;
  }
  const rounded = months.map((m) => ({ ...m, thisYear: round2(m.thisYear), lastYear: round2(m.lastYear) }));
  return {
    year,
    months: rounded,
    thisYearTotal: round2(rounded.reduce((s, m) => s + m.thisYear, 0)),
    lastYearTotal: round2(rounded.reduce((s, m) => s + m.lastYear, 0)),
  };
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function rank(map: Map<string, { count: number; revenue: number }>): RankedRow[] {
  return [...map.entries()]
    .map(([label, v]) => ({ label, count: v.count, revenue: round2(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count);
}

/**
 * Stats for appointments dated within the period. firstVisitByContact maps a customer
 * (email or phone key) to the date of their first ever confirmed appointment.
 */
export function computeDashboardStats(
  bookings: StatsBooking[],
  contactKey: (b: StatsBooking) => string | null,
  firstVisitByContact: Map<string, string>
): DashboardStats {
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");
  const cancelledByCustomer = cancelled.filter((b) => b.customerCancelledAt);

  const services = new Map<string, { count: number; revenue: number }>();
  const technicians = new Map<string, { count: number; revenue: number }>();
  const weekdays = WEEKDAYS.map(() => 0);
  const hours = new Map<number, number>();
  const newContacts = new Set<string>();
  const returningContacts = new Set<string>();
  const customers = new Map<string, { name: string; count: number; revenue: number }>();

  for (const b of confirmed) {
    const s = services.get(b.serviceName) ?? { count: 0, revenue: 0 };
    s.count++;
    s.revenue += b.servicePrice;
    services.set(b.serviceName, s);

    const t = technicians.get(b.technicianName) ?? { count: 0, revenue: 0 };
    t.count++;
    t.revenue += b.servicePrice;
    technicians.set(b.technicianName, t);

    const jsDay = getDay(parse(b.date, "yyyy-MM-dd", new Date()));
    weekdays[(jsDay + 6) % 7]++;
    const hour = Number(b.startTime.split(":")[0]);
    hours.set(hour, (hours.get(hour) ?? 0) + 1);

    const key = contactKey(b);
    if (key) {
      const first = firstVisitByContact.get(key);
      if (first && first < b.date) returningContacts.add(key);
      else newContacts.add(key);
      const c = customers.get(key) ?? { name: b.customerName?.trim() || "Customer", count: 0, revenue: 0 };
      c.count++;
      c.revenue += b.servicePrice;
      customers.set(key, c);
    }
  }
  for (const key of returningContacts) newContacts.delete(key);
  const customerTotal = newContacts.size + returningContacts.size;
  const topCustomers = [...customers.values()]
    .map((c) => ({ label: c.name, count: c.count, revenue: round2(c.revenue) }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
    .slice(0, 5);

  const depositsKept = cancelledByCustomer
    .filter((b) => b.depositAmount > 0 && !b.depositRefundedAt && b.stripeDepositPaymentIntentId)
    .reduce((sum, b) => sum + b.depositAmount, 0);
  const refundedDeposits = bookings
    .filter((b) => b.depositRefundedAt)
    .reduce((sum, b) => sum + b.depositAmount, 0);
  const revenue = confirmed.reduce((sum, b) => sum + b.servicePrice, 0);
  const decided = confirmed.length + cancelled.length;

  return {
    confirmed: confirmed.length,
    pending: bookings.filter((b) => b.status === "pending_deposit").length,
    cancelled: cancelled.length,
    cancelledByCustomer: cancelledByCustomer.length,
    cancellationRate: decided ? Math.round((cancelled.length / decided) * 100) : 0,
    rescheduled: bookings.filter((b) => b.rescheduleCount > 0).length,
    revenue: round2(revenue),
    depositsTaken: round2(confirmed.reduce((sum, b) => sum + b.depositAmount, 0)),
    depositsKept: round2(depositsKept),
    refundedDeposits: round2(refundedDeposits),
    averageBookingValue: confirmed.length ? round2(revenue / confirmed.length) : 0,
    newCustomers: newContacts.size,
    returningCustomers: returningContacts.size,
    repeatRate: customerTotal ? Math.round((returningContacts.size / customerTotal) * 100) : 0,
    lostToCancellations: round2(cancelled.reduce((sum, b) => sum + b.servicePrice, 0)),
    topServices: rank(services).slice(0, 8),
    topCustomers,
    byTechnician: rank(technicians),
    byWeekday: WEEKDAYS.map((label, i) => ({ label, count: weekdays[i] })),
    byHour: [...hours.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, count]) => ({ label: `${String(hour).padStart(2, "0")}:00`, count })),
  };
}
