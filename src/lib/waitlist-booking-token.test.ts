/**
 * Tests for waitlist same-day booking tokens and UK business date helpers.
 * Run: npm run test:waitlist-token
 */
import { parse } from "date-fns";
import {
  businessDateStr,
  businessEndOfDayUtc,
  businessTomorrowStr,
  isBeforeMinBookableDate,
  isBusinessToday,
} from "@/lib/business-time";
import {
  createWaitlistBookingToken,
  validateWaitlistBookingAccess,
  verifyWaitlistBookingToken,
} from "@/lib/waitlist-booking-token";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

process.env.JWT_SECRET = "waitlist-token-test-secret";

const entryId = "entry_test_123";
const serviceId = "service_abc";
const technicianId = "tech_xyz";
const today = "2026-07-05";
const atMorning = parse(`${today}T10:00:00`, "yyyy-MM-dd'T'HH:mm:ss", new Date());

const activeEntry = {
  status: "active",
  serviceId,
  technicianId,
  preferredDate: today,
  preferredDateEnd: null as string | null,
  notifyEarliest: false,
};

const earlierEntry = {
  ...activeEntry,
  preferredDate: "2026-07-08",
  notifyEarliest: true,
};

async function runOnce(run: number) {
  // --- business-time ---
  assert(businessDateStr(atMorning) === today, `[${run}] businessDateStr morning UK`);
  assert(businessTomorrowStr(atMorning) === "2026-07-06", `[${run}] businessTomorrowStr`);
  assert(isBusinessToday(today, atMorning), `[${run}] isBusinessToday true`);
  assert(!isBusinessToday("2026-07-04", atMorning), `[${run}] isBusinessToday false`);
  assert(isBeforeMinBookableDate(today, atMorning), `[${run}] today blocked without token`);
  assert(!isBeforeMinBookableDate("2026-07-06", atMorning), `[${run}] tomorrow allowed`);
  assert(
    businessEndOfDayUtc(today).getTime() > atMorning.getTime(),
    `[${run}] token expiry end-of-day is in the future`
  );

  // --- token roundtrip ---
  // Use a date whose UK end-of-day is still in the future so the JWT is not expired on verify.
  const tokenDate = businessDateStr(new Date(Date.now() + 48 * 60 * 60 * 1000));
  const token = await createWaitlistBookingToken({
    entryId,
    date: tokenDate,
    serviceId,
    technicianId,
  });
  assert(token.includes("."), `[${run}] token looks like JWT`);
  const claims = await verifyWaitlistBookingToken(token);
  assert(claims?.entryId === entryId, `[${run}] token entryId`);
  assert(claims?.date === tokenDate, `[${run}] token date`);
  assert(claims?.serviceId === serviceId, `[${run}] token serviceId`);

  const badClaims = await verifyWaitlistBookingToken(token + "x");
  assert(badClaims === null, `[${run}] tampered token rejected`);

  // --- validateWaitlistBookingAccess (no DB) ---
  assert(
    validateWaitlistBookingAccess(
      { entryId, date: today, serviceId, technicianId },
      { date: today, serviceId, technicianId },
      today,
      activeEntry
    ),
    `[${run}] valid access for exact date entry`
  );

  assert(
    validateWaitlistBookingAccess(
      { entryId, date: today, serviceId, technicianId },
      { date: today, serviceId, technicianId },
      today,
      earlierEntry
    ),
    `[${run}] valid access for earlier-dates entry on today`
  );

  assert(
    !validateWaitlistBookingAccess(
      { entryId, date: today, serviceId, technicianId },
      { date: today, serviceId, technicianId },
      today,
      { ...activeEntry, preferredDate: "2026-07-10" }
    ),
    `[${run}] rejects entry not interested in today`
  );

  assert(
    !validateWaitlistBookingAccess(
      { entryId, date: today, serviceId, technicianId },
      { date: today, serviceId, technicianId },
      today,
      { ...activeEntry, status: "fulfilled" }
    ),
    `[${run}] rejects fulfilled entry`
  );

  assert(
    !validateWaitlistBookingAccess(
      { entryId, date: today, serviceId, technicianId },
      { date: "2026-07-04", serviceId, technicianId },
      today,
      activeEntry
    ),
    `[${run}] rejects when context date is not token date`
  );

  assert(
    !validateWaitlistBookingAccess(
      { entryId, date: "2026-07-04", serviceId, technicianId },
      { date: "2026-07-04", serviceId, technicianId },
      today,
      activeEntry
    ),
    `[${run}] rejects when token date is not UK today`
  );

  // notifiedSlotDate no longer required — token + active entry + date interest is enough
  assert(
    validateWaitlistBookingAccess(
      { entryId, date: today, serviceId, technicianId },
      { date: today, serviceId, technicianId },
      today,
      activeEntry
    ),
    `[${run}] access without notifiedSlotDate field`
  );

  // --- simulate UTC server evening while UK is next calendar day ---
  const ukNextDayUtc = parse("2026-07-04T23:30:00Z", "yyyy-MM-dd'T'HH:mm:ssX", new Date());
  assert(
    businessDateStr(ukNextDayUtc) === "2026-07-05",
    `[${run}] UK date ahead of UTC on server`
  );
  assert(
    validateWaitlistBookingAccess(
      { entryId, date: "2026-07-05", serviceId, technicianId },
      { date: "2026-07-05", serviceId, technicianId },
      businessDateStr(ukNextDayUtc),
      { ...activeEntry, preferredDate: "2026-07-05" }
    ),
    `[${run}] same-day access when server UTC is still previous day`
  );
}

async function main() {
  for (let i = 1; i <= 5; i++) {
    await runOnce(i);
  }
  console.log("waitlist-booking-token: 5 runs, all checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
