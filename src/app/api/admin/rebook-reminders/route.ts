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

/** Rebook reminder check: who has been sent one (and whether they'd already rebooked), and who is due next. */
export async function GET(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can view this" }, { status: 403 });

  const [enabled, daysAfter] = await Promise.all([isRebookReminderEnabled(), getRebookReminderDaysAfter()]);
  const today = startOfDay(new Date());
  const from = format(today, "yyyy-MM-dd");
  const to = format(addDays(today, PREVIEW_DAYS - 1), "yyyy-MM-dd");
  const [plan, sent] = await Promise.all([getRebookReminderPlan(from, to, daysAfter), getSentReminderChecks()]);

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
      sent,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
