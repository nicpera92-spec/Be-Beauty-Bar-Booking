import { NextRequest, NextResponse } from "next/server";
import { normalizeCustomerContact, requestLoginCode } from "@/lib/customerPortal";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const contact = normalizeCustomerContact(body?.contact);
  if (!contact) {
    return NextResponse.json(
      { error: "Please enter the email address or mobile number you booked with." },
      { status: 400 }
    );
  }
  try {
    await requestLoginCode(contact);
  } catch (e) {
    console.error("my-bookings code:", e);
  }
  return NextResponse.json({ ok: true, channel: contact.type });
}
