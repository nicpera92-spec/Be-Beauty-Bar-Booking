import { NextRequest, NextResponse } from "next/server";
import { addDays, format, startOfDay } from "date-fns";
import { requireMaster } from "@/lib/auth";
import {
  getRebookReminderDaysAfter,
  getSentReminderChecks,
  isRebookReminderEnabled,
} from "@/lib/rebookReminder";

export const dynamic = "force-dynamic";

const REBOOKED_SHOWN_DAYS = 5;
const WAITING_SHOWN_DAYS = 30;

/** Rebook reminders: who's been reminded and not booked yet, and who rebooked (recently). */
export async function GET(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can view this" }, { status: 403 });

  const [enabled, daysAfter, sent] = await Promise.all([
    isRebookReminderEnabled(),
    getRebookReminderDaysAfter(),
    getSentReminderChecks(),
  ]);
  // Rebooked customers stay on the page for a few days after booking, then drop off.
  const rebookedShownSince = addDays(new Date(), -REBOOKED_SHOWN_DAYS).toISOString();
  const sentProperly = sent.filter((s) => !s.alreadyBookedDate);
  // Reminders that have gone stale without a rebooking drop off too.
  const waitingShownSince = addDays(new Date(), -WAITING_SHOWN_DAYS).toISOString();
  const waiting = sentProperly.filter((s) => !s.bookedAfterDate && s.sentAt >= waitingShownSince);
  const rebooked = sentProperly.filter(
    (s) => s.bookedAfterDate && s.bookedAfterMadeOn && s.bookedAfterMadeOn >= rebookedShownSince
  );

  return NextResponse.json(
    {
      enabled,
      daysAfter,
      today: format(startOfDay(new Date()), "yyyy-MM-dd"),
      waiting,
      rebooked,
      rebookedShownDays: REBOOKED_SHOWN_DAYS,
      waitingShownDays: WAITING_SHOWN_DAYS,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
