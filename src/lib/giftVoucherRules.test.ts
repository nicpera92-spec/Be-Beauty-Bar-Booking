/**
 * Tests for gift voucher codes and how vouchers pay deposits.
 * Run: npm run test:vouchers
 */
import {
  formatVoucherCode,
  isValidVoucherAmount,
  normalizeVoucherCode,
  randomVoucherCodeFrom,
  voucherDepositSplit,
} from "@/lib/giftVoucherRules";
import { describeRefundForCustomer, describeRefundForOwner } from "@/lib/customerCancellation";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// --- codes ---
const code = randomVoucherCodeFrom(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
assert(/^BB-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code), "generated code format");
assert(normalizeVoucherCode("bb-abcd-2345") === "BB-ABCD-2345", "lowercase with dashes");
assert(normalizeVoucherCode("BBABCD2345") === "BB-ABCD-2345", "no dashes");
assert(normalizeVoucherCode(" abcd 2345 ") === "BB-ABCD-2345", "without BB prefix and spaces");
assert(normalizeVoucherCode("BB-ABCD-2340") === null, "0 is not in the alphabet");
assert(normalizeVoucherCode("BB-ABC") === null, "too short");
assert(normalizeVoucherCode(42) === null, "non-string");
assert(formatVoucherCode("ABCD2345") === "BB-ABCD-2345", "format raw");

// --- amounts ---
assert(isValidVoucherAmount(50), "£50 ok");
assert(isValidVoucherAmount(10) && isValidVoucherAmount(500), "limits ok");
assert(!isValidVoucherAmount(9) && !isValidVoucherAmount(501), "outside limits");
assert(!isValidVoucherAmount(25.5), "whole pounds only");

// --- paying deposits ---
assert(eq(voucherDepositSplit(10.05, 50), { voucher: 10.05, card: 0 }), "voucher covers full deposit");
assert(eq(voucherDepositSplit(20, 15), { voucher: 15, card: 5 }), "partial voucher, rest by card");
assert(eq(voucherDepositSplit(10.05, 10), { voucher: 9.55, card: 0.5 }), "leaves at least 50p for the card");
assert(eq(voucherDepositSplit(0.4, 10), { voucher: 0.4, card: 0 }), "tiny deposit fully covered");
assert(eq(voucherDepositSplit(10, 0), { voucher: 0, card: 10 }), "empty voucher pays nothing");
assert(eq(voucherDepositSplit(0, 50), { voucher: 0, card: 0 }), "no deposit, nothing used");

// --- refund wording with vouchers ---
const base = { balance: "none" as const, balanceAmount: 0, refundHours: 48 };
const fullVoucher = describeRefundForCustomer({
  ...base,
  deposit: "none",
  depositAmount: 0,
  voucherAmount: 10,
  voucherReturned: 10,
});
assert(fullVoucher === "£10.00 has been returned to your gift voucher.", "voucher-only refund wording");
const split = describeRefundForCustomer({
  ...base,
  deposit: "refunded",
  depositAmount: 5,
  voucherAmount: 15,
  voucherReturned: 15,
});
assert(split.includes("deposit of £5.00 has been refunded") && split.includes("£15.00 has been returned"), "split refund");
const kept = describeRefundForCustomer({ ...base, deposit: "forfeited", depositAmount: 5, voucherAmount: 15 });
assert(kept.includes("deposit of £20.00 is non-refundable"), "late cancellation keeps whole deposit");
assert(
  describeRefundForOwner({ ...base, deposit: "none", depositAmount: 0, voucherAmount: 10, voucherReturned: 10 }) ===
    "£10.00 returned to the customer's gift voucher.",
  "owner voucher-only wording"
);

console.log("giftVoucherRules: all checks passed");
