import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { certificateMismatchMessage, lookupVoucher } from "@/lib/giftVouchers";
import { describeCertificateItem, matchCertificateItem, voucherDepositSplit } from "@/lib/giftVoucherRules";

/**
 * Code check for the booking form. Certificates: ?serviceId= says whether it pays for that
 * treatment. Old credit vouchers: ?deposit= shows how much of that deposit it would pay.
 */
export async function GET(req: NextRequest) {
  const voucher = await lookupVoucher(req.nextUrl.searchParams.get("code"));
  if (!voucher.ok) return NextResponse.json({ error: voucher.error }, { status: 404 });

  if (voucher.kind === "certificate") {
    const serviceId = req.nextUrl.searchParams.get("serviceId");
    const service = serviceId
      ? await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true, name: true, price: true } })
      : null;
    const item = service ? matchCertificateItem(voucher.items, service) : null;
    if (service && !item) {
      return NextResponse.json({ error: certificateMismatchMessage(voucher.items) }, { status: 404 });
    }
    return NextResponse.json({
      kind: "certificate",
      code: voucher.code,
      expiresAt: voucher.expiresAt,
      covers: item ? describeCertificateItem(item) : null,
      available: voucher.items.filter((i) => i.status === "available").map(describeCertificateItem),
    });
  }

  const deposit = Number(req.nextUrl.searchParams.get("deposit") ?? 0);
  const split = Number.isFinite(deposit) && deposit > 0 ? voucherDepositSplit(deposit, voucher.balance) : null;
  return NextResponse.json({
    kind: "credit",
    code: voucher.code,
    balance: voucher.balance,
    expiresAt: voucher.expiresAt,
    ...(split && {
      appliedToDeposit: split.voucher,
      depositDueByCard: split.card,
      addedToSalonBalance: split.salon,
    }),
  });
}
