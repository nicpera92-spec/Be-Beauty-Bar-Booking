import { NextRequest, NextResponse } from "next/server";
import { lookupVoucher } from "@/lib/giftVouchers";
import { voucherDepositSplit } from "@/lib/giftVoucherRules";

/** Balance check for the booking form; ?deposit= shows how much of that deposit it would pay. */
export async function GET(req: NextRequest) {
  const voucher = await lookupVoucher(req.nextUrl.searchParams.get("code"));
  if (!voucher.ok) return NextResponse.json({ error: voucher.error }, { status: 404 });
  const deposit = Number(req.nextUrl.searchParams.get("deposit") ?? 0);
  const split = Number.isFinite(deposit) && deposit > 0 ? voucherDepositSplit(deposit, voucher.balance) : null;
  return NextResponse.json({
    code: voucher.code,
    balance: voucher.balance,
    expiresAt: voucher.expiresAt,
    ...(split && { appliedToDeposit: split.voucher, depositDueByCard: split.card }),
  });
}
