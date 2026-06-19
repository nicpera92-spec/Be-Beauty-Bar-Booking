import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setRebookReminderOptOut, verifyRebookOptOutToken } from "@/lib/rebookReminder";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const payload = await verifyRebookOptOutToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }

  await setRebookReminderOptOut(payload);

  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { businessName: true },
  });

  return NextResponse.json({
    ok: true,
    businessName: settings?.businessName ?? "Be Beauty Bar",
  });
}
