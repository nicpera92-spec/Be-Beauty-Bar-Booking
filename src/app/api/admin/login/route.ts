import { NextRequest, NextResponse } from "next/server";
import { validateAdminCredentials, createAdminToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const valid = await validateAdminCredentials(email.trim(), password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createAdminToken(email.trim());
    return NextResponse.json({ token });
  } catch (e) {
    console.error("admin login:", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
