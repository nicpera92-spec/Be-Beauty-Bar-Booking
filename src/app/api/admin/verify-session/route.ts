import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";

/** GET: Check if admin token is valid. Returns { ok: true } or 401. */
export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Admin session invalid or expired." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, email: admin.email });
}
