import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth";
import { createSalonCertificate } from "@/lib/giftVouchers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can manage vouchers" }, { status: 403 });

  const vouchers = await prisma.giftVoucher.findMany({
    where: { status: { not: "pending_payment" } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      transactions: { orderBy: { createdAt: "desc" }, take: 20 },
      items: {
        orderBy: { position: "asc" },
        include: { bookings: { select: { id: true, date: true, startTime: true, status: true } } },
      },
    },
  });
  return NextResponse.json(vouchers, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can manage vouchers" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const result = await createSalonCertificate({
    packageId: body?.packageId,
    serviceIds: body?.serviceIds,
    recipientName: body?.recipientName,
    recipientEmail: body?.recipientEmail,
    message: body?.message,
    sendEmail: Boolean(body?.sendEmail),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
