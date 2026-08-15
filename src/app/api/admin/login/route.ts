import { NextRequest, NextResponse } from "next/server";
import { validateStaffCredentials, createStaffToken } from "@/lib/auth";
import { isRetryableDbError } from "@/lib/databaseUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const session = await validateStaffCredentials(email.trim(), password);
    if (!session) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createStaffToken(session);
    return NextResponse.json({
      token,
      role: session.role,
      technicianId: session.technicianId ?? null,
      name: session.name ?? null,
    });
  } catch (e) {
    console.error("admin login:", e);
    if (isRetryableDbError(e)) {
      return NextResponse.json(
        { error: "Login is temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
