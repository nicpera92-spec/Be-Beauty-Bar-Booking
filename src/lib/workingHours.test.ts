import assert from "node:assert/strict";
import {
  defaultWeeklyHours,
  parseWorkingHours,
  resolveHoursForDate,
  validateWorkingHoursPayload,
} from "./workingHours";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`fail - ${name}`);
    throw e;
  }
}

test("defaultWeeklyHours uses salon times for all days", () => {
  const w = defaultWeeklyHours("10:00", "18:00");
  assert.equal(w.length, 7);
  assert.equal(w[0]!.openTime, "10:00");
  assert.equal(w[0]!.isOff, false);
});

test("null workingHours resolves to salon hours every day", () => {
  const r = resolveHoursForDate("2026-07-30", null, "09:00", "17:00");
  assert.deepEqual(r, { isOff: false, openTime: "09:00", closeTime: "17:00" });
});

test("off day returns isOff", () => {
  const week = defaultWeeklyHours();
  week[4]!.isOff = true; // Thursday (2026-07-30 is Thursday)
  const r = resolveHoursForDate("2026-07-30", week, "09:00", "17:00");
  assert.deepEqual(r, { isOff: true });
});

test("custom hours for a weekday", () => {
  const week = defaultWeeklyHours();
  week[1]!.openTime = "11:00"; // Monday
  week[1]!.closeTime = "15:00";
  // 2026-07-27 is Monday
  const r = resolveHoursForDate("2026-07-27", week);
  assert.deepEqual(r, { isOff: false, openTime: "11:00", closeTime: "15:00" });
});

test("parseWorkingHours recovers bad rows", () => {
  const parsed = parseWorkingHours(
    [{ isOff: true }, null, { isOff: false, openTime: "bad", closeTime: "17:00" }],
    "08:00",
    "20:00"
  );
  assert.equal(parsed.length, 7);
  assert.equal(parsed[0]!.isOff, true);
  assert.equal(parsed[1]!.openTime, "08:00");
  assert.equal(parsed[2]!.openTime, "08:00");
});

test("validateWorkingHoursPayload rejects open >= close", () => {
  const week = defaultWeeklyHours();
  week[1]!.openTime = "17:00";
  week[1]!.closeTime = "09:00";
  const r = validateWorkingHoursPayload(week);
  assert.equal(r.ok, false);
});

test("validateWorkingHoursPayload accepts valid week", () => {
  const week = defaultWeeklyHours("09:00", "17:00");
  week[0]!.isOff = true;
  const r = validateWorkingHoursPayload(week);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.hours[0]!.isOff, true);
});

console.log("All workingHours tests passed.");
