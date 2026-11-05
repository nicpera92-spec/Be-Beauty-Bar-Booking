import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cronAuth";
import { processDailySchedules } from "@/lib/dailySchedule";

/**
 * Cron: email each technician tomorrow's bookings at 7pm UK. Scheduled at 18:00 and 19:00 UTC so
 * one run lands on 7pm in both GMT and BST; the other run skips itself. ?force=1 sends now.
 */
async function run(req: NextRequest) {
  const rejected = rejectUnlessCron(req);
  if (rejected) return rejected;
  try {
    const force = req.nextUrl.searchParams.get("force") === "1";
    const result = await processDailySchedules(new Date(), { force });
    return NextResponse.json({
      ok: true,
      ...result,
      message: result.reason
        ? `Skipped: ${result.reason}.`
        : `Sent ${result.sent} schedule email(s).${result.failed ? ` ${result.failed} failed.` : ""}`,
    });
  } catch (e) {
    console.error("daily-schedule:", e);
    return NextResponse.json({ error: "Failed to send daily schedules" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
