import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cronAuth";
import { processReviewRequests } from "@/lib/reviewRequests";

/** Cron (daily): ask yesterday's customers for a Google review. Protected by CRON_SECRET. */
async function run(req: NextRequest) {
  const rejected = rejectUnlessCron(req);
  if (rejected) return rejected;
  try {
    const result = await processReviewRequests();
    return NextResponse.json({
      ok: true,
      ...result,
      message: result.enabled
        ? `Sent ${result.sent} review request(s). Skipped ${result.skipped}.${result.failed ? ` ${result.failed} failed.` : ""}`
        : "Review requests are turned off or no review link is set.",
    });
  } catch (e) {
    console.error("review-requests:", e);
    return NextResponse.json({ error: "Failed to send review requests" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
