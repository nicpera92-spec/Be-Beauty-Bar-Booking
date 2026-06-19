import { NextRequest, NextResponse } from "next/server";
import { processRebookReminders } from "@/lib/rebookReminder";

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = req.nextUrl.searchParams.get("secret");
  const provided = bearer ?? querySecret;

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processRebookReminders();

    return NextResponse.json({
      ok: true,
      ...result,
      message:
        result.sent === 0 && result.failed === 0
          ? result.today
            ? `No customers due for rebook reminder today (${result.daysAfter} days after their last visit).`
            : "Rebook reminders are turned off."
          : `Sent ${result.sent} rebook reminder(s). Skipped ${result.skipped}.${result.failed > 0 ? ` ${result.failed} failed.` : ""}`,
    });
  } catch (e) {
    console.error("send-rebook-reminders:", e);
    return NextResponse.json({ error: "Failed to send rebook reminders" }, { status: 500 });
  }
}

/**
 * Cron endpoint: polite rebook reminders N days after a customer's last confirmed visit.
 * Protect with CRON_SECRET. Schedule daily (e.g. 09:00).
 */
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
