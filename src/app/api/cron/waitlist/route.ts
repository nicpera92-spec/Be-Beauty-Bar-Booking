import { NextRequest, NextResponse } from "next/server";
import { processWaitlistNotifications } from "@/lib/waitlist";

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = req.nextUrl.searchParams.get("secret");
  if ((bearer ?? querySecret) !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processWaitlistNotifications();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("waitlist cron:", e);
    return NextResponse.json({ error: "Failed to process waitlist" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
