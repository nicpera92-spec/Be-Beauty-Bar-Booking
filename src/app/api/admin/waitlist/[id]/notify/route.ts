import { NextRequest, NextResponse } from "next/server";
import { requireMaster } from "@/lib/auth";
import { notifyWaitlistEntryNow } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json(
      { error: "Only the owner can send waitlist notifications" },
      { status: 403 }
    );
  }

  try {
    const result = await notifyWaitlistEntryNow(params.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Could not notify" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      sent: result.sent ?? false,
      message: result.message,
    });
  } catch (e) {
    console.error("admin waitlist entry notify:", e);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
