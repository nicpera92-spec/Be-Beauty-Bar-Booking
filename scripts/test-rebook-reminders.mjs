/** Smoke tests for rebook reminder scheduling. Run: node scripts/test-rebook-reminders.mjs */

import { addDays, format, parse } from "date-fns";

const DEFAULT_DAYS = 21;

function rebookReminderDueDate(visitDate, daysAfter) {
  return format(addDays(parse(visitDate, "yyyy-MM-dd", new Date()), daysAfter), "yyyy-MM-dd");
}

function contactKey(booking) {
  return booking.email?.toLowerCase() ?? booking.phone ?? null;
}

function latestVisitPerContact(bookings) {
  const latest = new Map();
  for (const booking of bookings) {
    const key = contactKey(booking);
    if (!key || latest.has(key)) continue;
    latest.set(key, booking);
  }
  return [...latest.values()];
}

// Customer rebooks within 21 days — timer resets to newer visit
const bookings = [
  { id: "old", email: "alex@test.com", date: "2026-01-01" },
  { id: "new", email: "alex@test.com", date: "2026-01-15" },
].sort((a, b) => b.date.localeCompare(a.date));

const latest = latestVisitPerContact(bookings)[0];
assert(latest.id === "new", "latest visit is the most recent appointment");
assert(
  rebookReminderDueDate("2026-01-01", DEFAULT_DAYS) === "2026-01-22",
  "old visit due date"
);
assert(
  rebookReminderDueDate("2026-01-15", DEFAULT_DAYS) === "2026-02-05",
  "new visit due date after rebook"
);
assert(
  rebookReminderDueDate(latest.date, DEFAULT_DAYS) !== rebookReminderDueDate("2026-01-01", DEFAULT_DAYS),
  "rebook resets reminder date"
);

console.log("All rebook reminder tests passed.");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
