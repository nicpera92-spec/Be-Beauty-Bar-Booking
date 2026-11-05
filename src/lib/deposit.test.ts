/**
 * Tests for percentage-based service deposits.
 * Run: npm run test:deposit
 */
import { depositFromPercent, formatDepositPercent, isValidDepositPercent } from "@/lib/deposit";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(depositFromPercent(55, 25) === 13.75, "25% of £55 is £13.75");
assert(depositFromPercent(55, 20) === 11, "20% of £55 is £11");
assert(depositFromPercent(33.33, 10) === 3.33, "rounds to the nearest penny");
assert(depositFromPercent(45, 100) === 45, "100% is the full price");

assert(isValidDepositPercent(25), "25 is valid");
assert(isValidDepositPercent(100), "100 is valid");
assert(!isValidDepositPercent(0), "0 is not valid");
assert(!isValidDepositPercent(101), "over 100 is not valid");
assert(!isValidDepositPercent(null), "null is not valid");
assert(!isValidDepositPercent(""), "empty is not valid");

assert(formatDepositPercent(25) === "25%", "whole percentage label");
assert(formatDepositPercent(12.5) === "12.5%", "decimal percentage label");

console.log("deposit: all checks passed");
