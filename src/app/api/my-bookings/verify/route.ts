import { NextRequest, NextResponse } from "next/server";
import { normalizeCustomerContact, verifyLoginCode } from "@/lib/customerPortal";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const contact = normalizeCustomerContact(body?.contact);
  if (!contact) {
    return NextResponse.json({ error: "Please start again." }, { status: 400 });
  }
  const token = await verifyLoginCode(contact, body?.code);
  if (!token) {
    return NextResponse.json(
      { error: "That code isn't right or has expired. Please check it or ask for a new one." },
      { status: 401 }
    );
  }
  return NextResponse.json({ token });
}
