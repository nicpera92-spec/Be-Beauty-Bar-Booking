import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth";
import { createSalonVoucher } from "@/lib/giftVouchers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can manage vouchers" }, { status: 403 });

  const vouchers = await prisma.giftVoucher.findMany({
    where: { status: { not: "pending_payment" } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  return NextResponse.json(vouchers, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can manage vouchers" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const result = await createSalonVoucher({
    amount: body?.amount,
    recipientName: body?.recipientName,
    recipientEmail: body?.recipientEmail,
    note: body?.note,
    sendEmail: Boolean(body?.sendEmail),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
