import assert from "node:assert/strict";
import { parse } from "date-fns";
import {
  excludedCategoriesFor,
  hasExcludedCategoryOverlap,
  normalizeExclusionPair,
  type TimedBooking,
} from "./categoryCapacity";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`fail - ${name}`);
    throw e;
  }
}

test("normalizeExclusionPair sorts and rejects same category", () => {
  assert.deepEqual(normalizeExclusionPair("lash", "pedicure"), {
    categoryA: "lash",
    categoryB: "pedicure",
  });
  assert.deepEqual(normalizeExclusionPair("pedicure", "lash"), {
    categoryA: "lash",
    categoryB: "pedicure",
  });
  assert.equal(normalizeExclusionPair("lash", "lash"), null);
});

test("excludedCategoriesFor is bidirectional", () => {
  const pairs = [{ categoryA: "lash", categoryB: "pedicure" }];
  assert.deepEqual([...excludedCategoriesFor("lash", pairs)], ["pedicure"]);
  assert.deepEqual([...excludedCategoriesFor("pedicure", pairs)], ["lash"]);
  assert.equal(excludedCategoriesFor("nails", pairs).size, 0);
});

test("hasExcludedCategoryOverlap blocks when excluded category overlaps", () => {
  const day = parse("2026-07-30", "yyyy-MM-dd", new Date());
  const bookings: TimedBooking[] = [
    { startTime: "10:00", endTime: "12:00", service: { category: "lash" } },
  ];
  const pairs = [{ categoryA: "lash", categoryB: "pedicure" }];
  assert.equal(
    hasExcludedCategoryOverlap(bookings, "pedicure", day, "11:00", "12:00", pairs),
    true
  );
  assert.equal(
    hasExcludedCategoryOverlap(bookings, "pedicure", day, "12:00", "13:00", pairs),
    false
  );
  assert.equal(
    hasExcludedCategoryOverlap(bookings, "nails", day, "11:00", "12:00", pairs),
    false
  );
});

console.log("All category exclusion tests passed.");
