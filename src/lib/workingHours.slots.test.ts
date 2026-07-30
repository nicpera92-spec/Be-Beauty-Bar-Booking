import assert from "node:assert/strict";
import { parse } from "date-fns";
import { getSlotsForDay } from "./slotUtils";
import { defaultWeeklyHours, resolveHoursForDate } from "./workingHours";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`fail - ${name}`);
    throw e;
  }
}

test("off day yields no slots when resolved then gated", () => {
  const week = defaultWeeklyHours("09:00", "17:00");
  week[4]!.isOff = true; // Thu
  const hours = resolveHoursForDate("2026-07-30", week);
  assert.equal(hours.isOff, true);
});

test("short day only produces slots within custom window", () => {
  const week = defaultWeeklyHours();
  week[1]!.openTime = "10:00";
  week[1]!.closeTime = "12:00";
  const hours = resolveHoursForDate("2026-07-27", week); // Mon
  assert.equal(hours.isOff, false);
  if (hours.isOff) throw new Error("expected working");
  const day = parse("2026-07-27", "yyyy-MM-dd", new Date());
  const slots = getSlotsForDay(
    "2026-07-27",
    day,
    hours.openTime,
    hours.closeTime,
    30,
    60,
    [],
    [],
    new Date("2026-07-01T00:00:00")
  );
  assert.ok(slots.length > 0);
  assert.equal(slots[0]!.start, "10:00");
  assert.ok(slots.every((s) => s.start >= "10:00" && s.end <= "12:00"));
  assert.ok(!slots.some((s) => s.start === "09:00"));
});

test("null hours fall back to salon full day", () => {
  const hours = resolveHoursForDate("2026-07-27", null, "09:00", "17:00");
  assert.equal(hours.isOff, false);
  if (hours.isOff) throw new Error("expected working");
  const day = parse("2026-07-27", "yyyy-MM-dd", new Date());
  const slots = getSlotsForDay(
    "2026-07-27",
    day,
    hours.openTime,
    hours.closeTime,
    60,
    60,
    [],
    [],
    new Date("2026-07-01T00:00:00")
  );
  assert.equal(slots[0]!.start, "09:00");
  assert.equal(slots[slots.length - 1]!.start, "16:00");
});

console.log("All working-hours slot integration tests passed.");
