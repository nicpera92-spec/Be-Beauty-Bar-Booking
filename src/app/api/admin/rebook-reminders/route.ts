import { NextRequest, NextResponse } from "next/server";
import { addDays, format, startOfDay } from "date-fns";
import { requireMaster } from "@/lib/auth";
import {
  getRebookReminderDaysAfter,
  getRebookReminderPlan,
  getSentReminderChecks,
  isRebookReminderEnabled,
} from "@/lib/rebookReminder";

export const dynamic = "force-dynamic";

const PREVIEW_DAYS = 14;
const REBOOKED_SHOWN_DAYS = 5;
const WAITING_SHOWN_DAYS = 30;

/** Rebook reminders: who's been reminded and not booked yet, who rebooked (recently), and who's due next. */
export async function GET(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can view this" }, { status: 403 });

  const [enabled, daysAfter] = await Promise.all([isRebookReminderEnabled(), getRebookReminderDaysAfter()]);
  const today = startOfDay(new Date());
  const from = format(today, "yyyy-MM-dd");
  const to = format(addDays(today, PREVIEW_DAYS - 1), "yyyy-MM-dd");
  const [plan, sent] = await Promise.all([getRebookReminderPlan(from, to, daysAfter), getSentReminderChecks()]);
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
      today: from,
      upcoming: plan.map((d) => ({
        bookingId: d.visit.id,
        customerName: d.visit.customerName,
        contact: d.visit.customerEmail || d.visit.customerPhone || "",
        serviceName: d.visit.service.name,
        visitDate: d.visit.date,
        dueDate: d.dueDate,
        send: d.send,
        reason: d.reason ?? null,
        nextBookingDate: d.nextBookingDate ?? null,
      })),
      waiting,
      rebooked,
      rebookedShownDays: REBOOKED_SHOWN_DAYS,
      waitingShownDays: WAITING_SHOWN_DAYS,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
