import { NextRequest, NextResponse } from "next/server";
import { requireMaster } from "@/lib/auth";
import { processWaitlistNotifications } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json({ error: "Only the owner can run waitlist notifications" }, { status: 403 });
  }

  try {
    const result = await processWaitlistNotifications();
    const total = result.notifiedEarliest + result.notifiedPreferredDate;
    return NextResponse.json({
      ok: true,
      ...result,
      message:
        total === 0
          ? "No new waitlist notifications to send (no matching open slots, or everyone already notified)."
          : `Sent ${total} waitlist notification(s).`,
    });
  } catch (e) {
    console.error("admin waitlist notify:", e);
    return NextResponse.json({ error: "Failed to process waitlist" }, { status: 500 });
  }
}
