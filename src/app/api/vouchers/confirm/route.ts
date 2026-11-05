import { NextRequest, NextResponse } from "next/server";
import { confirmVoucherSession } from "@/lib/giftVouchers";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
  if (!sessionId) return NextResponse.json({ error: "Missing session" }, { status: 400 });
  try {
    const result = await confirmVoucherSession(sessionId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (e) {
    console.error("voucher confirm:", e);
    return NextResponse.json({ error: "Could not confirm payment" }, { status: 500 });
  }
}
