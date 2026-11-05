import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth";
import { adjustVoucherBalance, recordVoucherTransaction } from "@/lib/giftVouchers";

/** { action: "use", amount, note } | { action: "add", amount, note } | { action: "cancel" } */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can manage vouchers" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 200) : null;

  if (body?.action === "cancel") {
    const voucher = await prisma.giftVoucher.findUnique({ where: { id: params.id } });
    if (!voucher || voucher.status !== "active") {
      return NextResponse.json({ error: "Voucher isn't active" }, { status: 400 });
    }
    await prisma.giftVoucher.update({ where: { id: params.id }, data: { status: "cancelled" } });
    await recordVoucherTransaction(params.id, 0, note ?? "Voucher cancelled");
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "use" || body?.action === "add") {
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter an amount more than £0" }, { status: 400 });
    }
    const result = await adjustVoucherBalance(
      params.id,
      body.action === "use" ? -amount : amount,
      note ?? (body.action === "use" ? "Used in salon" : "Value added back")
    );
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
