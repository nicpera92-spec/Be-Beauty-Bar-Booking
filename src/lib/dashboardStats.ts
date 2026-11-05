import { getDay, parse } from "date-fns";

export type StatsBooking = {
  id: string;
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
  topServices: RankedRow[];
  byTechnician: RankedRow[];
  byWeekday: { label: string; count: number }[];
  byHour: { label: string; count: number }[];
};

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
    }
  }
  for (const key of returningContacts) newContacts.delete(key);

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
    topServices: rank(services).slice(0, 8),
    byTechnician: rank(technicians),
    byWeekday: WEEKDAYS.map((label, i) => ({ label, count: weekdays[i] })),
    byHour: [...hours.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, count]) => ({ label: `${String(hour).padStart(2, "0")}:00`, count })),
  };
}
