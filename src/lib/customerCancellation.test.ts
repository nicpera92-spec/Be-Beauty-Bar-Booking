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
const base = { depositAmount: 20.05, balanceAmount: 30, balance: "none" as const };
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
  legacy.bookingConfirmedCustomerSms.endsWith(`Cancel here: ${cancelToken}`),
  "saved SMS without link gets a Cancel here link"
);

const earlierAppend = resolveNotificationMessages({
  bookingConfirmedCustomerSms: `Hi **Customer name**, you're booked! Need to cancel? ${cancelToken}`,
});
assert(
  earlierAppend.bookingConfirmedCustomerSms.endsWith(`booked! Cancel here: ${cancelToken}`),
  "earlier Need to cancel wording becomes Cancel here"
);

const link = buildCancelLink("booking_abc");
const html = renderEmailBody(defaults.bookingConfirmedCustomerBody, { cancelLink: link, customerName: "Alex" });
assert(html.includes(`<a href="${link}">Cancel your booking</a>`), "email renders a clean cancel link");
const sms = applyTemplate(defaults.bookingConfirmedCustomerSms, {
  cancelLink: formatShortCancelLink("Ab3dEf9h2K"),
});
assert(sms.includes("Cancel here: bbbar.co.uk/c/Ab3dEf9h2K"), "SMS contains short cancel link");

console.log("customerCancellation: all checks passed");
