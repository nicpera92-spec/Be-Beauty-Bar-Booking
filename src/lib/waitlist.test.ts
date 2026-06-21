import { parse } from "date-fns";
import { isWaitlistSlotStillBookable, slotsFreedByCancellation } from "@/lib/waitlist";

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

const available = [
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "14:00", end: "15:00" },
];

const freedOneHour = slotsFreedByCancellation(today, available, "10:00", "11:00", atMorning);
assert(freedOneHour.length === 1 && freedOneHour[0].startTime === "10:00", "60min cancel frees one slot");

const freedTwoHours = slotsFreedByCancellation(today, available, "10:00", "12:00", atMorning);
assert(freedTwoHours.length === 2, "longer cancel can free multiple service-length slots");

const freedTooShort = slotsFreedByCancellation(
  today,
  [{ start: "14:00", end: "15:00" }],
  "10:00",
  "10:30",
  atMorning
);
assert(freedTooShort.length === 0, "no slot when freed window is too short for service duration");

const freedPast = slotsFreedByCancellation(today, available, "10:00", "11:00", atAfternoon);
assert(freedPast.length === 0, "past slots within cancel window are excluded");

console.log("waitlist: 10 checks passed");
