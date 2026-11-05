import { NextRequest, NextResponse } from "next/server";
import { requireMaster } from "@/lib/auth";
import { adjustVoucherBalance, cancelVoucherWithRefund, setCertificateItemUsed } from "@/lib/giftVouchers";

/**
 * { action: "use" | "add", amount, note } (old credit vouchers) | { action: "use_item" | "unuse_item", itemId }
 * (certificate treatments) | { action: "cancel" }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can manage vouchers" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 200) : null;

  if (body?.action === "cancel") {
    const result = await cancelVoucherWithRefund(params.id, note);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  if (body?.action === "use_item" || body?.action === "unuse_item") {
    if (typeof body?.itemId !== "string") return NextResponse.json({ error: "Missing treatment" }, { status: 400 });
    const result = await setCertificateItemUsed(params.id, body.itemId, body.action === "use_item");
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
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
