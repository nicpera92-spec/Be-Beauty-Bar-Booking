import { NextRequest, NextResponse } from "next/server";
import { createVoucherCheckout } from "@/lib/giftVouchers";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    const result = await createVoucherCheckout(body ?? {});
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ url: result.url });
  } catch (e) {
    console.error("voucher checkout:", e);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
