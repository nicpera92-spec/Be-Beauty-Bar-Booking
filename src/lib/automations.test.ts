/**
 * Tests for review requests, daily schedules, business stats and My bookings contact matching.
 * Run: npm run test:automations
 */
import { reviewRequestDates, selectReviewCandidates } from "@/lib/reviewRequests";
import { formatSalonSchedule, formatScheduleLines, groupScheduleByTechnician } from "@/lib/dailySchedule";
import { DEFAULT_NOTIFICATION_MESSAGES } from "@/lib/notificationDefaults";
import { renderEmailBody } from "@/lib/notificationTemplates";
import { computeDashboardStats, type StatsBooking } from "@/lib/dashboardStats";
import { bookingMatchesContact, normalizeCustomerContact } from "@/lib/customerPortal";
import { contactKeyForBooking, hasLaterBooking, indexLatestBookingDates } from "@/lib/rebookReminder";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// --- review requests ---
assert(
  JSON.stringify(reviewRequestDates("2026-11-05")) === JSON.stringify(["2026-11-04", "2026-11-03"]),
  "review window is yesterday and the day before"
);
const visit = (id: string, over: Partial<{ customerEmail: string | null; customerPhone: string | null; notifyByEmail: boolean; notifyBySMS: boolean }> = {}) => ({
  id,
  date: "2026-11-04",
  customerEmail: "a@example.com",
  customerPhone: null,
  notifyByEmail: true,
  notifyBySMS: false,
  ...over,
});
const picked = selectReviewCandidates(
  [
    visit("1"),
    visit("2"), // same customer, second appointment
    visit("3", { customerEmail: "recent@example.com" }),
    visit("4", { customerEmail: null, customerPhone: "07700 900123", notifyByEmail: false, notifyBySMS: true }),
    visit("5", { customerEmail: "x@example.com", notifyByEmail: false }), // no channel chosen
  ],
  new Set(["recent@example.com"])
);
assert(picked.map((p) => p.id).join(",") === "1,4", "one request per customer, skips recent and no-channel");

// --- daily schedule ---
const grouped = groupScheduleByTechnician([
  { technicianId: "t1", startTime: "14:00", endTime: "15:00", status: "confirmed", customerName: "B", customerPhone: null, notes: null, service: { name: "Nails" } },
  { technicianId: "t1", startTime: "09:30", endTime: "10:30", status: "pending_deposit", customerName: "A", customerPhone: null, notes: null, service: { name: "Nails" } },
  { technicianId: "t2", startTime: "11:00", endTime: "12:00", status: "cancelled", customerName: "C", customerPhone: null, notes: null, service: { name: "Lashes" } },
]);
assert(grouped.get("t1")?.map((b) => b.startTime).join(",") === "09:30,14:00", "sorted by time");
assert(!grouped.has("t2"), "cancelled bookings left out");
const lines = formatScheduleLines([
  { technicianId: "t1", startTime: "09:30", endTime: "10:30", status: "pending_deposit", customerName: "Ann", customerPhone: "07700 900123", notes: "Allergic\nto latex", service: { name: "Gel" } },
]);
assert(
  lines === "09:30–10:30 · Ann · Gel · 07700 900123 · Awaiting deposit\n    📝 Allergic to latex",
  "schedule line with phone, status and one-line note"
);
const salon = formatSalonSchedule([
  { technicianName: "Svitlana", bookings: grouped.get("t1")! },
  { technicianName: "Empty", bookings: [] },
]);
assert(salon.startsWith("SVITLANA (2 appointments)\n09:30–10:30"), "owner summary grouped by technician");
assert(!salon.includes("EMPTY"), "technicians without bookings left out of owner summary");
const scheduleHtml = renderEmailBody(DEFAULT_NOTIFICATION_MESSAGES.dailyScheduleBody, {
  technicianName: "Svitlana",
  date: "Friday 6 November",
  appointmentCount: "2 appointments",
  scheduleList: salon,
  businessName: "Be Beauty Bar",
});
assert(scheduleHtml.includes("SVITLANA (2 appointments)<br>09:30–10:30"), "schedule renders line by line");
assert(!scheduleHtml.includes("**"), "no leftover placeholders");

// --- gift voucher emails are editable templates ---
const voucherHtml = renderEmailBody(DEFAULT_NOTIFICATION_MESSAGES.giftVoucherRecipientBody, {
  recipientName: "Alex",
  voucherAmount: "£50",
  businessName: "Be Beauty Bar",
  buyerName: "Jamie",
  voucherMessage: "",
  voucherCode: "BB-ABCD-2345",
  voucherExpiry: "5 November 2027",
  bookLink: "bbbar.co.uk: https://bbbar.co.uk/book",
});
assert(voucherHtml.includes("Your voucher code: BB-ABCD-2345"), "voucher code in recipient email");
assert(!voucherHtml.includes("<p></p>"), "empty personal message leaves no blank paragraph");

// --- dashboard ---
const b = (over: Partial<StatsBooking>): StatsBooking => ({
  id: Math.random().toString(36),
  date: "2026-11-10",
  startTime: "10:00",
  status: "confirmed",
  servicePrice: 50,
  depositAmount: 10,
  balancePaidOnline: false,
  depositRefundedAt: null,
  customerCancelledAt: null,
  rescheduleCount: 0,
  stripeDepositPaymentIntentId: "pi_1",
  customerEmail: "new@example.com",
  customerPhone: null,
  serviceName: "Lashes",
  technicianName: "Svitlana",
  ...over,
});
const stats = computeDashboardStats(
  [
    b({}),
    b({ customerEmail: "old@example.com", servicePrice: 30, serviceName: "Nails", date: "2026-11-11" }),
    b({ status: "cancelled", customerCancelledAt: new Date(), customerEmail: "late@example.com" }),
    b({ status: "cancelled", customerCancelledAt: new Date(), depositRefundedAt: new Date(), customerEmail: "early@example.com" }),
    b({ status: "pending_deposit", rescheduleCount: 1 }),
  ],
  contactKeyForBooking,
  new Map([
    ["new@example.com", "2026-11-10"],
    ["old@example.com", "2025-06-01"],
  ])
);
assert(stats.confirmed === 2 && stats.revenue === 80, "confirmed count and takings");
assert(stats.cancelled === 2 && stats.cancellationRate === 50, "cancellation rate");
assert(stats.depositsKept === 10, "late cancellation deposit kept");
assert(stats.refundedDeposits === 10, "refunded deposits");
assert(stats.newCustomers === 1 && stats.returningCustomers === 1, "new vs returning");
assert(stats.topServices[0].label === "Lashes", "top service by revenue");
assert(stats.byWeekday.find((d) => d.label === "Tue")?.count === 1, "10 Nov 2026 is a Tuesday");
assert(stats.rescheduled === 1 && stats.pending === 1, "moved and pending counts");

// --- My bookings contact matching ---
assert(normalizeCustomerContact("Nic.Pera@Hotmail.com ")?.key === "nic.pera@hotmail.com", "email lowercased");
assert(normalizeCustomerContact("07718 933160")?.key === "+447718933160", "UK mobile normalised");
assert(normalizeCustomerContact("hello") === null, "junk rejected");
const phone = normalizeCustomerContact("+44 7718 933160")!;
assert(bookingMatchesContact({ customerEmail: null, customerPhone: "07718933160" }, phone), "phone formats match");
assert(!bookingMatchesContact({ customerEmail: null, customerPhone: "07718933161" }, phone), "different phone");

// --- rebook reminders skip customers who already rebooked ---
const lastVisit = { date: "2026-10-08", customerEmail: "Ann@Example.com", customerPhone: "07700 900111" };
const rebookIndex = indexLatestBookingDates([
  lastVisit,
  { date: "2026-11-20", customerEmail: null, customerPhone: "+447700900111" }, // upcoming, phone only
  { date: "2026-10-01", customerEmail: "old@example.com", customerPhone: null },
]);
assert(hasLaterBooking(lastVisit, rebookIndex), "upcoming booking under same phone (other format) blocks reminder");
assert(
  hasLaterBooking(
    { date: "2026-10-08", customerEmail: "ann@example.com", customerPhone: null },
    indexLatestBookingDates([{ date: "2026-12-01", customerEmail: "ANN@example.com", customerPhone: null }])
  ),
  "upcoming booking under same email (any case) blocks reminder"
);
assert(
  !hasLaterBooking(
    { date: "2026-10-01", customerEmail: "old@example.com", customerPhone: null },
    rebookIndex
  ),
  "customer with no later booking still gets their reminder"
);
assert(
  !hasLaterBooking(lastVisit, indexLatestBookingDates([lastVisit])),
  "the visit itself doesn't count as a later booking"
);

console.log("automations: all checks passed");
