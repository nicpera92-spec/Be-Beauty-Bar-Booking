/**
 * Tests for review requests, daily schedules, business stats and My bookings contact matching.
 * Run: npm run test:automations
 */
import { reviewRequestDates, selectReviewCandidates } from "@/lib/reviewRequests";
import { formatSalonSchedule, formatScheduleLines, groupScheduleByTechnician } from "@/lib/dailySchedule";
import { DEFAULT_NOTIFICATION_MESSAGES } from "@/lib/notificationDefaults";
import {
  giftEmailBodyWithMessage,
  renderEmailBody,
  resolveNotificationMessages,
} from "@/lib/notificationTemplates";
import { computeDashboardStats, type StatsBooking } from "@/lib/dashboardStats";
import { bookingMatchesContact, normalizeCustomerContact } from "@/lib/customerPortal";
import {
  type RebookVisit,
  checkSentReminders,
  contactKeyForBooking,
  hasLaterBooking,
  indexLatestBookingDates,
  planRebookReminders,
} from "@/lib/rebookReminder";
import { buildReviewTrackingLink, verifyReviewToken } from "@/lib/reviewTracking";

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

// --- gift certificate emails are editable templates ---
const giftVars = {
  recipientName: "Alex",
  voucherAmount: "£65",
  businessName: "Be Beauty Bar",
  buyerName: "Jamie",
  voucherMessage: "",
  voucherCode: "BB-ABCD-2345",
  voucherExpiry: "5 November 2027",
  voucherTreatments: "• Gel Manicure with Sarah\n• Lash Lift with Sarah",
  bookLink: "bbbar.co.uk: https://bbbar.co.uk/book",
};
const voucherHtml = renderEmailBody(DEFAULT_NOTIFICATION_MESSAGES.giftCertificateRecipientBody, giftVars);
assert(voucherHtml.includes("Your certificate code: BB-ABCD-2345"), "code in gift email");
assert(voucherHtml.includes("• Gel Manicure with Sarah<br>• Lash Lift with Sarah"), "treatments listed in gift email");
assert(voucherHtml.includes("Jamie has treated you"), "buyer named in gift email");
assert(!voucherHtml.includes("<p></p>"), "empty personal message leaves no blank paragraph");
assert(!voucherHtml.includes("**"), "no leftover gift placeholders");
const resolvedGift = resolveNotificationMessages(null).giftCertificateRecipientBody;
const withMessage = renderEmailBody(giftEmailBodyWithMessage(resolvedGift, "Happy birthday x"), {
  ...giftVars,
  voucherMessage: "“Happy birthday x”",
});
assert(withMessage.includes("“Happy birthday x”"), "personal message in gift email");
const editedWithoutMessage = resolveNotificationMessages({
  giftCertificateRecipientBody: "Hi **Recipient name**, enjoy! Code: **Certificate code**\n\n— **Salon name**",
}).giftCertificateRecipientBody;
const forced = renderEmailBody(giftEmailBodyWithMessage(editedWithoutMessage, "Love you"), {
  ...giftVars,
  voucherMessage: "“Love you”",
});
assert(forced.includes("<p>“Love you”</p><p>— Be Beauty Bar</p>"), "message added back if the template drops it");
assert(
  giftEmailBodyWithMessage(editedWithoutMessage, "") === editedWithoutMessage,
  "no message, template untouched"
);

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

// --- rebook reminder plan: exactly who the 9am run sends to ---
let visitSeq = 0;
const rv = (over: Partial<RebookVisit>): RebookVisit => ({
  id: `v${++visitSeq}`,
  date: "2026-10-15",
  startTime: "10:00",
  customerName: "Someone",
  customerEmail: null,
  customerPhone: null,
  notifyByEmail: true,
  notifyBySMS: true,
  rebookReminderSentAt: null,
  ...over,
});
const planDay = "2026-11-05"; // 21 days after 15 Oct
const visits = [
  rv({ id: "due", customerEmail: "due@example.com" }),
  rv({ id: "rebooked-upcoming", customerEmail: "up@example.com" }),
  rv({ id: "rebooked-pending", customerPhone: "07700 900222", notifyByEmail: false }),
  rv({ id: "older-visit", date: "2026-09-01", customerEmail: "back@example.com" }),
  rv({ id: "came-back", date: "2026-10-15", customerEmail: "BACK@example.com", customerPhone: "07700 900333" }),
  rv({ id: "phone-old", date: "2026-10-15", customerPhone: "07700 900333", customerEmail: null, startTime: "09:00" }),
  rv({ id: "sent", customerEmail: "sent@example.com", rebookReminderSentAt: new Date("2026-11-05T09:00:00Z") }),
  rv({ id: "no-channel", customerEmail: "quiet@example.com", notifyByEmail: false, notifyBySMS: false }),
  rv({ id: "opted-out", customerEmail: "stop@example.com" }),
  rv({ id: "not-yet", date: "2026-10-20", customerEmail: "later@example.com" }),
  rv({ id: "cancelled-rebook", customerEmail: "cancel@example.com" }),
];
const live = [
  ...visits,
  { date: "2026-11-20", customerEmail: "up@example.com", customerPhone: null },
  { date: "2026-11-12", customerEmail: null, customerPhone: "+447700900222" }, // awaiting deposit
  // cancel@example.com's cancelled rebooking is not a live booking, so it isn't listed here
];
const plan = planRebookReminders({
  visits,
  liveBookings: live,
  daysAfter: 21,
  from: planDay,
  to: planDay,
  isOptedOut: (v) => v.customerEmail === "stop@example.com",
});
const decision = (id: string) => plan.find((d) => d.visit.id === id);
assert(decision("due")?.send === true, "customer with no later booking is reminded on day 21");
assert(
  decision("rebooked-upcoming")?.send === false && decision("rebooked-upcoming")?.reason === "already_booked",
  "customer with an upcoming booking is not reminded"
);
assert(decision("rebooked-upcoming")?.nextBookingDate === "2026-11-20", "shows which booking stopped it");
assert(decision("rebooked-pending")?.reason === "already_booked", "booking awaiting deposit also counts as rebooked");
assert(!decision("older-visit"), "an older visit never triggers a reminder once they've been back");
assert(decision("came-back")?.send === true, "their most recent visit is the one that counts");
assert(
  !decision("phone-old"),
  "same person's other same-day booking (phone only) doesn't get a second reminder"
);
assert(decision("sent")?.reason === "already_sent", "never sent twice for the same visit");
assert(decision("no-channel")?.reason === "no_contact", "respects their email/SMS choice");
assert(decision("opted-out")?.reason === "opted_out", "respects opt-out");
assert(!decision("not-yet"), "not due yet (only 16 days)");
assert(decision("cancelled-rebook")?.send === true, "a rebooking they cancelled doesn't block the reminder");
assert(plan.filter((d) => d.send).length === 3, "exactly 3 reminders go out");
const catchUp = planRebookReminders({
  visits: [rv({ id: "missed", date: "2026-10-13", customerEmail: "missed@example.com" })],
  liveBookings: [],
  daysAfter: 21,
  from: "2026-11-03",
  to: planDay,
  isOptedOut: () => false,
});
assert(catchUp[0]?.send === true && catchUp[0].dueDate === "2026-11-03", "a missed day is caught up");

// --- checking reminders already sent ---
const sentAt = new Date("2026-11-05T09:00:00Z");
const hb = (date: string, createdAt: string, over: Partial<{ status: string; customerEmail: string | null; customerPhone: string | null; customerCancelledAt: Date | null; updatedAt: Date }> = {}) => ({
  date,
  customerEmail: "amy@example.com",
  customerPhone: null,
  status: "confirmed",
  createdAt: new Date(createdAt),
  updatedAt: new Date(createdAt),
  customerCancelledAt: null,
  ...over,
});
const sentVisit = (id: string, email: string) => ({
  ...rv({ id, customerEmail: email, date: "2026-10-15" }),
  serviceName: "Gel",
  rebookReminderSentAt: sentAt,
});
const checks = checkSentReminders(
  [sentVisit("mistake", "amy@example.com"), sentVisit("fine", "bea@example.com"), sentVisit("cancelled-first", "cat@example.com")],
  [
    hb("2026-11-20", "2026-10-30T12:00:00Z"),
    hb("2026-11-25", "2026-11-06T12:00:00Z", { customerEmail: "BEA@example.com" }),
    hb("2026-11-18", "2026-10-20T12:00:00Z", {
      customerEmail: "cat@example.com",
      status: "cancelled",
      customerCancelledAt: new Date("2026-10-25T12:00:00Z"),
    }),
  ]
);
const check = (id: string) => checks.find((c) => c.bookingId === id)!;
assert(check("mistake").alreadyBookedDate === "2026-11-20", "flags a reminder sent to someone already booked");
assert(
  check("fine").alreadyBookedDate === null && check("fine").bookedAfterDate === "2026-11-25",
  "booking made after the reminder counts as it working, not a mistake"
);
assert(check("cancelled-first").alreadyBookedDate === null, "a booking cancelled before the reminder isn't a mistake");

// --- review link tracking ---
const reviewLink = buildReviewTrackingLink("cmbooking123");
const reviewToken = reviewLink.split("/r/")[1];
assert(verifyReviewToken(reviewToken) === "cmbooking123", "review link identifies the booking");
assert(verifyReviewToken(reviewToken.slice(0, -1) + "x") === null, "tampered review link rejected");
assert(verifyReviewToken("cmotherbooking." + reviewToken.split(".")[1]) === null, "signature is per booking");

console.log("automations: all checks passed");
