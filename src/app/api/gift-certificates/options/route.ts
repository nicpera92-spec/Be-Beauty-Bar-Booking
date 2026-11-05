import { NextResponse } from "next/server";
import { getGiftOptions } from "@/lib/giftVouchers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getGiftOptions(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("gift options:", e);
    return NextResponse.json({ error: "Could not load treatments" }, { status: 500 });
  }
}
