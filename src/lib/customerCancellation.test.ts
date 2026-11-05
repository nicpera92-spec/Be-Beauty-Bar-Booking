/**
 * Tests for customer self-cancellation (48-hour refund rule, signed links, messages).
 * Run: npm run test:cancellation
 */
process.env.JWT_SECRET = "customer-cancel-test-secret";
process.env.NEXT_PUBLIC_APP_URL = "https://bbbar.co.uk";

import {
  appointmentStartUtc,
  buildCancelLink,
  createCancelSignature,
  formatShortCancelLink,
  describeRefundForCustomer,
  describeRefundForOwner,
  getCustomerCancelState,
  verifyCancelSignature,
} from "@/lib/customerCancellation";
import { normalizeRefundHours, resolveCancellationPolicy } from "@/lib/cancellationPolicy";
import { getRescheduleEligibility } from "@/lib/customerReschedule";
import {
  applyTemplate,
  friendlyToken,
  renderEmailBody,
  resolveNotificationMessages,
} from "@/lib/notificationTemplates";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const HOUR = 60 * 60 * 1000;

// --- appointment time is UK local (BST in summer, GMT in winter) ---
assert(
  appointmentStartUtc("2026-07-10", "14:00").toISOString() === "2026-07-10T13:00:00.000Z",
  "BST appointment converts to UTC"
);
assert(
  appointmentStartUtc("2026-12-10", "9:30").toISOString() === "2026-12-10T09:30:00.000Z",
  "GMT appointment converts to UTC (single-digit hour)"
);

// --- 48-hour rule ---
const confirmed = { status: "confirmed", date: "2026-07-10", startTime: "14:00" };
const start = appointmentStartUtc(confirmed.date, confirmed.startTime).getTime();
assert(getCustomerCancelState(confirmed, new Date(start - 72 * HOUR)) === "refundable", "72h before refundable");
assert(getCustomerCancelState(confirmed, new Date(start - 48 * HOUR)) === "refundable", "exactly 48h refundable");
assert(
  getCustomerCancelState(confirmed, new Date(start - 48 * HOUR + 60_000)) === "non_refundable",
  "47h59m before non-refundable"
);
assert(getCustomerCancelState(confirmed, new Date(start - HOUR)) === "non_refundable", "1h before non-refundable");
assert(getCustomerCancelState(confirmed, new Date(start)) === "appointment_passed", "at start time passed");
assert(
  getCustomerCancelState({ ...confirmed, status: "cancelled" }, new Date(start - 72 * HOUR)) ===
    "already_cancelled",
  "cancelled booking shows already cancelled"
);
assert(
  getCustomerCancelState({ ...confirmed, status: "pending_deposit" }, new Date(start - 72 * HOUR)) ===
    "not_confirmed",
  "pending booking not cancellable"
);

// --- owner-configured refund window ---
assert(
  getCustomerCancelState(confirmed, new Date(start - 30 * HOUR), 24) === "refundable",
  "30h before refundable with a 24h window"
);
assert(
  getCustomerCancelState(confirmed, new Date(start - 60 * HOUR), 72) === "non_refundable",
  "60h before non-refundable with a 72h window"
);
assert(
  getCustomerCancelState(confirmed, new Date(start - HOUR), 0) === "refundable",
  "0h window always refundable before start"
);
assert(normalizeRefundHours("abc") === 48, "invalid hours fall back to 48");
assert(normalizeRefundHours(999) === 336, "hours capped at 336");
assert(normalizeRefundHours(-5) === 0, "hours floored at 0");

// --- policy text ---
const defaultPolicy = resolveCancellationPolicy(null, 48);
assert(defaultPolicy.length === 6, "default policy has 6 points");
assert(
  defaultPolicy[1].some((s) => s.bold && s.text === "once"),
  "default policy explains moving an appointment once"
);
assert(
  defaultPolicy[2].some((s) => s.bold && s.text === "more than 48 hours"),
  "default policy bolds the refund window with hours filled in"
);
const customPolicy = resolveCancellationPolicy("- First point\n\n**Bold** then [hours]h\n", 24);
assert(customPolicy.length === 2, "blank lines skipped");
assert(customPolicy[0][0].text === "First point", "leading bullet characters stripped");
assert(customPolicy[1][0].bold && customPolicy[1][0].text === "Bold", "**text** becomes bold");
assert(customPolicy[1][1].text === " then 24h", "[hours] replaced in custom policy");

// --- signed link ---
const sig = createCancelSignature("booking_abc");
assert(sig.length === 16, "signature is short for SMS");
assert(verifyCancelSignature("booking_abc", sig), "valid signature accepted");
assert(!verifyCancelSignature("booking_xyz", sig), "signature for another booking rejected");
const tampered = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
assert(!verifyCancelSignature("booking_abc", tampered), "tampered signature rejected");
assert(!verifyCancelSignature("booking_abc", null), "missing signature rejected");
assert(
  buildCancelLink("booking_abc") === `https://bbbar.co.uk/cancel/booking_abc/${sig}`,
  "cancel link format"
);
assert(formatShortCancelLink("Ab3dEf9h2K") === "bbbar.co.uk/c/Ab3dEf9h2K", "short SMS link has no protocol");

// --- refund wording ---
const base = { depositAmount: 20.05, balanceAmount: 30, balance: "none" as const, refundHours: 48 };
assert(
  describeRefundForCustomer({ ...base, deposit: "forfeited", refundHours: 72 }).includes("within 72 hours"),
  "forfeited wording uses configured hours"
);
assert(
  describeRefundForCustomer({ ...base, deposit: "refunded" }).includes("£20.05 has been refunded"),
  "customer refunded wording"
);
assert(
  describeRefundForCustomer({ ...base, deposit: "forfeited" }).includes("non-refundable"),
  "customer forfeited wording"
);
assert(
  describeRefundForOwner({ ...base, deposit: "refund_failed" }).includes("manually"),
  "owner told to refund manually when Stripe fails"
);
assert(
  describeRefundForCustomer({ ...base, deposit: "forfeited", balance: "refunded" }).includes(
    "£30.00 you prepaid online has also been refunded"
  ),
  "prepaid balance refunded even when deposit kept"
);

// --- confirmation messages always include the cancel link ---
const cancelToken = friendlyToken("Cancel link");
const defaults = resolveNotificationMessages(null);
assert(defaults.bookingConfirmedCustomerBody.includes(cancelToken), "default email has cancel link");
assert(defaults.bookingConfirmedCustomerSms.includes(cancelToken), "default SMS has cancel link");

const legacy = resolveNotificationMessages({
  bookingConfirmedCustomerBody: "Hi **Customer name**, you're booked!\n\n— **Salon name**",
  bookingConfirmedCustomerSms: "Hi **Customer name**, you're booked!",
});
assert(legacy.bookingConfirmedCustomerBody.includes(cancelToken), "saved email without link gets one");
assert(
  legacy.bookingConfirmedCustomerSms.includes(`booked! Cancel here: ${cancelToken}`),
  "saved SMS without link gets a Cancel here link"
);

const earlierAppend = resolveNotificationMessages({
  bookingConfirmedCustomerSms: `Hi **Customer name**, you're booked! Need to cancel? ${cancelToken}`,
});
assert(
  earlierAppend.bookingConfirmedCustomerSms.includes(`booked! Cancel here: ${cancelToken}`) &&
    !earlierAppend.bookingConfirmedCustomerSms.includes("Need to cancel?"),
  "earlier Need to cancel wording becomes Cancel here"
);

const link = buildCancelLink("booking_abc");
const html = renderEmailBody(defaults.bookingConfirmedCustomerBody, { cancelLink: link, customerName: "Alex" });
assert(
  html.includes(`<a href="${link}">Change or cancel your booking</a>`),
  "email renders a clean cancel link"
);
const lineBreakHtml = renderEmailBody("Need help?\nCancel your booking: {{cancelLink}}", { cancelLink: link });
assert(
  lineBreakHtml.includes(`Need help?<br><a href="${link}">Cancel your booking</a>`),
  "link on the line after other text renders without a stray br>"
);

// --- reschedule rules ---
const movable = { ...confirmed, rescheduleCount: 0 };
assert(
  getRescheduleEligibility(movable, new Date(start - 72 * HOUR), 48).allowed,
  "can move more than 48h before"
);
const late = getRescheduleEligibility(movable, new Date(start - 10 * HOUR), 48);
assert(!late.allowed && late.reason === "too_late", "can't move within 48h");
const twice = getRescheduleEligibility({ ...movable, rescheduleCount: 1 }, new Date(start - 72 * HOUR), 48);
assert(!twice.allowed && twice.reason === "already_rescheduled", "can only move once");
const gone = getRescheduleEligibility({ ...movable, status: "cancelled" }, new Date(start - 72 * HOUR), 48);
assert(!gone.allowed && gone.reason === "not_available", "cancelled booking can't be moved");
const sms = applyTemplate(defaults.bookingConfirmedCustomerSms, {
  cancelLink: formatShortCancelLink("Ab3dEf9h2K"),
});
assert(sms.includes("Cancel here: bbbar.co.uk/c/Ab3dEf9h2K"), "SMS contains short cancel link");

console.log("customerCancellation: all checks passed");
