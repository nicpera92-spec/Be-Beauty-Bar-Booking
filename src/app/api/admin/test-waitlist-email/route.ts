import { NextRequest, NextResponse } from "next/server";
import { requireMaster } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWaitlistPreviewEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json({ error: "Only the owner can send test emails" }, { status: 403 });
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
        { error: "Set a business email in Settings or pass { \"to\": \"you@example.com\" }." },
        { status: 400 }
      );
    }

    const result = await sendWaitlistPreviewEmail(to);
    if (!result.ok) {
      const status = result.error === "RESEND_API_KEY not set" ? 503 : 502;
      return NextResponse.json({ error: result.error ?? "Failed to send" }, { status });
    }
    return NextResponse.json({ ok: true, message: `Preview sent to ${to}` });
  } catch (e) {
    console.error("waitlist preview email:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
