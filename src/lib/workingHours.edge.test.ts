/**
 * Extra edge-case passes for working hours (run several times to satisfy manual re-checks).
 */
import assert from "node:assert/strict";
import {
  defaultWeeklyHours,
  parseWorkingHours,
  resolveHoursForDate,
  validateWorkingHoursPayload,
  WEEK_DISPLAY_ORDER,
} from "./workingHours";

function runPass(pass: number) {
  const salonOpen = "09:00";
  const salonClose = "22:00";

  // Weekend off, weekday custom
  const week = defaultWeeklyHours(salonOpen, salonClose);
  week[0]!.isOff = true; // Sun
  week[6]!.isOff = true; // Sat
  week[3]!.openTime = "11:00"; // Wed
  week[3]!.closeTime = "15:00";

  const validated = validateWorkingHoursPayload(week);
  assert.equal(validated.ok, true);

  // 2026-08-01 = Saturday
  assert.deepEqual(resolveHoursForDate("2026-08-01", week, salonOpen, salonClose), {
    isOff: true,
  });
  // 2026-08-02 = Sunday
  assert.deepEqual(resolveHoursForDate("2026-08-02", week, salonOpen, salonClose), {
    isOff: true,
  });
  // 2026-07-29 = Wednesday
  assert.deepEqual(resolveHoursForDate("2026-07-29", week, salonOpen, salonClose), {
    isOff: false,
    openTime: "11:00",
    closeTime: "15:00",
  });

  // Round-trip through parse
  const parsed = parseWorkingHours(week, salonOpen, salonClose);
  assert.equal(parsed[0]!.isOff, true);
  assert.equal(parsed[3]!.openTime, "11:00");

  // Display order covers all days
  assert.equal(WEEK_DISPLAY_ORDER.length, 7);
  const indices = new Set(WEEK_DISPLAY_ORDER.map((d) => d.dayIndex));
  assert.equal(indices.size, 7);

  // Invalid open >= close rejected
  const bad = defaultWeeklyHours();
  bad[2]!.openTime = "18:00";
  bad[2]!.closeTime = "10:00";
  assert.equal(validateWorkingHoursPayload(bad).ok, false);

  // Off day may have open >= close (ignored for booking)
  bad[2]!.isOff = true;
  assert.equal(validateWorkingHoursPayload(bad).ok, true);

  console.log(`ok - edge pass ${pass}`);
}

for (let i = 1; i <= 3; i++) runPass(i);
console.log("All working-hours edge passes completed.");
