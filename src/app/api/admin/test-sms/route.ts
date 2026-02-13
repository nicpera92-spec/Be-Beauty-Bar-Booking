import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { sendSMS, formatUKPhoneToE164 } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Please log in again to Admin (session expired or missing)." }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawTo = body?.to?.trim();
    if (!rawTo) {
      return NextResponse.json(
        { error: "Pass { \"to\": \"07...\" or \"447...\" } with the phone number to send a test SMS." },
        { status: 400 }
      );
    }
    const to = formatUKPhoneToE164(rawTo);
    if (!to || to.length < 10) {
      return NextResponse.json(
        { error: "Invalid phone number. Use UK format (07... or 447...)." },
        { status: 400 }
      );
    }
    const result = await sendSMS(to, "Be Beauty Bar test: if you got this, SMS is working. Booking confirmations and cancellations will use the same setup.");
    if (!result.ok) {
      const status = result.error === "SMS not configured" ? 503 : 502;
      const msg = `SMS Works: ${result.error ?? "Unknown error"}`;
      return NextResponse.json({ error: msg }, { status });
    }
    return NextResponse.json({ ok: true, message: "Test SMS sent to " + to });
  } catch (e) {
    console.error("Test SMS error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
