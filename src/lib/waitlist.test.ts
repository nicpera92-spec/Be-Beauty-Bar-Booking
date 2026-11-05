import { parse } from "date-fns";
import { isWaitlistSlotStillBookable, slotsFreedByCancellation, waitlistEntryFulfilledByBooking, mergeWaitlistPreferences, waitlistEntryInterestedInDate, findWaitlistBooking, type WaitlistBookingCandidate } from "@/lib/waitlist";

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

// Cross-service: same 2hr window, different services may have different valid slot shapes
const lashCancelWindow = { start: "14:00", end: "16:00" };
const lashSlots = [{ start: "14:00", end: "16:00" }];
const nailSlots = [
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
];
const nailsInLashWindow = slotsFreedByCancellation(
  today,
  nailSlots,
  lashCancelWindow.start,
  lashCancelWindow.end,
  atMorning
);
assert(nailsInLashWindow.length === 2, "shorter nail slots fit inside freed lash window");
const lashesInOwnWindow = slotsFreedByCancellation(
  today,
  lashSlots,
  lashCancelWindow.start,
  lashCancelWindow.end,
  atMorning
);
assert(lashesInOwnWindow.length === 1 && lashesInOwnWindow[0].startTime === "14:00", "lash slot fills window");

assert(
  waitlistEntryFulfilledByBooking(
    { preferredDate: "2026-07-02", preferredDateEnd: null, notifyEarliest: false },
    "2026-07-02"
  ),
  "exact preferred date fulfills entry"
);
assert(
  !waitlistEntryFulfilledByBooking(
    { preferredDate: "2026-07-04", preferredDateEnd: null, notifyEarliest: false },
    "2026-07-02"
  ),
  "earlier booking does not fulfill without earliest opt-in"
);
assert(
  waitlistEntryFulfilledByBooking(
    { preferredDate: "2026-07-04", preferredDateEnd: null, notifyEarliest: true },
    "2026-07-02"
  ),
  "earlier booking fulfills when earliest opt-in"
);

const merged = mergeWaitlistPreferences(
  { preferredDate: "2026-07-02", preferredDateEnd: null, notifyEarliest: false },
  { preferredDate: "2026-07-03", preferredDateEnd: "2026-07-05", notifyEarliest: false }
);
assert(
  merged.preferredDate === "2026-07-02" &&
    merged.preferredDateEnd === "2026-07-05" &&
    !merged.notifyEarliest,
  "overlapping sign-ups merge to one date range"
);

assert(
  waitlistEntryInterestedInDate(
    { preferredDate: "2026-07-02", preferredDateEnd: "2026-07-05", notifyEarliest: false },
    "2026-07-04"
  ),
  "date inside explicit range matches"
);
assert(
  !waitlistEntryInterestedInDate(
    { preferredDate: "2026-07-02", preferredDateEnd: "2026-07-05", notifyEarliest: false },
    "2026-07-06"
  ),
  "date after range does not match"
);

const signup = {
  preferredDate: "2026-12-02",
  preferredDateEnd: "2026-12-10",
  notifyEarliest: false,
  technicianId: "tech_1",
  customerEmail: null,
  customerPhone: "+447718933160",
  createdAt: new Date("2026-10-01T10:00:00Z"),
};
const booking = (over: Partial<WaitlistBookingCandidate>): WaitlistBookingCandidate => ({
  id: "b",
  serviceId: "svc_1",
  technicianId: "tech_1",
  customerEmail: null,
  customerPhone: "07718 933160",
  date: "2026-12-05",
  startTime: "10:00",
  status: "confirmed",
  createdAt: new Date("2026-10-22T09:00:00Z"),
  ...over,
});

assert(
  findWaitlistBooking(signup, [booking({ id: "match" })])?.id === "match",
  "booking with differently formatted phone matches waitlist entry"
);
assert(
  findWaitlistBooking(signup, [booking({ date: "2026-12-12" })]) === null,
  "booking outside wanted dates does not match"
);
assert(
  findWaitlistBooking(signup, [booking({ technicianId: "tech_2" })]) === null,
  "booking with another technician does not match"
);
assert(
  findWaitlistBooking(signup, [booking({ createdAt: new Date("2026-09-01T09:00:00Z") })]) === null,
  "booking made before joining the waiting list does not match"
);
assert(
  findWaitlistBooking(signup, [
    booking({ id: "cancelled", status: "cancelled", date: "2026-12-03" }),
    booking({ id: "live", date: "2026-12-08" }),
  ])?.id === "live",
  "live booking preferred over cancelled one"
);

console.log("waitlist: 23 checks passed");
