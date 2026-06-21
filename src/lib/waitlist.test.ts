import { parse } from "date-fns";
import { isWaitlistSlotStillBookable } from "@/lib/waitlist";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const today = "2026-06-20";
const atMorning = parse(`${today} 09:00`, "yyyy-MM-dd HH:mm", new Date());
const atAfternoon = parse(`${today} 14:30`, "yyyy-MM-dd HH:mm", new Date());

assert(
  isWaitlistSlotStillBookable(today, "15:00", atMorning),
  "same-day future slot is bookable"
);
assert(
  !isWaitlistSlotStillBookable(today, "10:00", atAfternoon),
  "same-day past slot is not bookable"
);
assert(
  isWaitlistSlotStillBookable("2026-06-21", "09:00", atAfternoon),
  "future date slot is bookable"
);
assert(
  !isWaitlistSlotStillBookable("2026-06-19", "15:00", atAfternoon),
  "past date slot is not bookable"
);
assert(
  isWaitlistSlotStillBookable(today, "14:30", atAfternoon),
  "slot starting now is still bookable"
);

console.log("waitlist: 5 checks passed");
