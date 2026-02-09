import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTestEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    let to: string | null = body?.to?.trim() || null;
    if (!to) {
      const settings = await prisma.businessSettings.findUnique({
        where: { id: "default" },
        select: { businessEmail: true },
      });
      to = settings?.businessEmail?.trim() || null;
    }
    if (!to) {
      return NextResponse.json(
        { error: "No email address. Set Business email in Settings or pass { \"to\": \"you@example.com\" }." },
        { status: 400 }
      );
    }
    const result = await sendTestEmail(to);
    if (!result.ok) {
      const msg = result.error ?? "Failed to send test email";
      const status = result.error === "RESEND_API_KEY not set" ? 503 : 502;
      return NextResponse.json({ error: msg }, { status });
    }
    return NextResponse.json({ ok: true, message: "Test email sent to " + to });
  } catch (e) {
    console.error("Test email error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
