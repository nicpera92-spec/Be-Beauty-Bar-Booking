/**
 * Tests for gift voucher codes and how vouchers pay deposits.
 * Run: npm run test:vouchers
 */
import {
  type CertificateItemLike,
  certificateTreatmentsText,
  formatVoucherCode,
  matchCertificateItem,
  normalizeVoucherCode,
  randomVoucherCodeFrom,
  sumPrices,
  voucherDepositSplit,
  voucherRefundAmount,
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

// --- certificate treatments ---
const item = (id: string, over: Partial<CertificateItemLike> = {}): CertificateItemLike => ({
  id,
  serviceId: "gel-svitlana",
  serviceName: "Gel Manicure",
  price: 30,
  status: "available",
  ...over,
});
const gelSvitlana = { id: "gel-svitlana", name: "Gel Manicure", price: 30 };
assert(matchCertificateItem([item("a")], gelSvitlana)?.id === "a", "exact treatment matches");
assert(
  matchCertificateItem([item("a", { status: "booked" }), item("b")], gelSvitlana)?.id === "b",
  "booked treatment skipped, next one on the combo used"
);
assert(
  matchCertificateItem([item("a", { status: "used" })], gelSvitlana) === null,
  "used treatment can't be booked"
);
assert(
  matchCertificateItem([item("a", { price: 25 })], { ...gelSvitlana, price: 35 })?.id === "a",
  "same treatment still covered after a price rise"
);
assert(
  matchCertificateItem([item("a")], { id: "gel-anna", name: " gel manicure ", price: 30 })?.id === "a",
  "same-named treatment with another technician at the same price"
);
assert(
  matchCertificateItem([item("a")], { id: "gel-anna", name: "Gel Manicure", price: 40 }) === null,
  "another technician's dearer version isn't covered"
);
assert(
  matchCertificateItem([item("a")], { id: "lash", name: "Lash Lift", price: 30 }) === null,
  "different treatment not covered"
);
assert(
  certificateTreatmentsText(
    [
      { serviceName: "Gel Manicure", technicianName: "Svitlana" },
      { serviceName: "Lash Lift", technicianName: null },
    ],
    "Pamper Package"
  ) === "Pamper Package\n• Gel Manicure with Svitlana\n• Lash Lift",
  "treatment list for emails"
);
assert(sumPrices([{ price: 30.1 }, { price: 25.2 }]) === 55.3, "combo total rounds to pence");

// --- refunds when a certificate is cancelled ---
const cert = (statuses: string[], paid = 65) => ({
  kind: "certificate",
  initialAmount: paid,
  balance: 0,
  items: [
    { price: 30, status: statuses[0] },
    { price: 45, status: statuses[1] },
  ],
});
assert(voucherRefundAmount(cert(["available", "available"])) === 65, "unused combo refunded in full");
assert(voucherRefundAmount(cert(["booked", "available"])) === 39, "combo discount shared: 45/75 of £65 = £39");
assert(voucherRefundAmount(cert(["used", "booked"])) === 0, "nothing left to refund");
assert(
  voucherRefundAmount({ kind: "credit", initialAmount: 50, balance: 12.5, items: [] }) === 12.5,
  "old credit voucher refunds its balance"
);

// --- paying deposits ---
assert(eq(voucherDepositSplit(10.05, 50), { voucher: 10.05, card: 0, salon: 0 }), "voucher covers full deposit");
assert(eq(voucherDepositSplit(20, 15), { voucher: 15, card: 5, salon: 0 }), "partial voucher, rest by card");
assert(
  eq(voucherDepositSplit(10.1, 10), { voucher: 10, card: 0, salon: 0.1 }),
  "£10 voucher on £10.10 deposit: no 50p card charge, 10p added to salon balance"
);
assert(eq(voucherDepositSplit(10.49, 10), { voucher: 10, card: 0, salon: 0.49 }), "49p shortfall goes to salon");
assert(eq(voucherDepositSplit(10.5, 10), { voucher: 10, card: 0.5, salon: 0 }), "50p shortfall can be paid by card");
assert(eq(voucherDepositSplit(0.4, 10), { voucher: 0.4, card: 0, salon: 0 }), "tiny deposit fully covered");
assert(eq(voucherDepositSplit(10, 0), { voucher: 0, card: 10, salon: 0 }), "empty voucher pays nothing");
assert(eq(voucherDepositSplit(0, 50), { voucher: 0, card: 0, salon: 0 }), "no deposit, nothing used");

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
const certificateBack = { serviceName: "Gel Manicure", code: "BB-ABCD-2345" };
assert(
  describeRefundForCustomer({ ...base, deposit: "none", depositAmount: 0, certificateReturned: certificateBack }) ===
    "Your Gel Manicure has been put back on your gift certificate (BB-ABCD-2345), so you can use it to book again.",
  "certificate booking cancelled: treatment goes back"
);
assert(
  describeRefundForOwner({ ...base, deposit: "none", depositAmount: 0, certificateReturned: certificateBack }).includes(
    "put back on it"
  ),
  "owner told the treatment went back on the certificate"
);

console.log("giftVoucherRules: all checks passed");
