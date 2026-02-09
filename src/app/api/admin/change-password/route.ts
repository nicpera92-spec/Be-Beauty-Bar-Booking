import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyAdminRequest,
  verifyPassword,
  hashPassword,
} from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "currentPassword and newPassword required" },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const settings = await prisma.businessSettings.findUnique({
      where: { id: "default" },
    });
    if (!settings?.adminPasswordHash || settings.adminLoginEmail?.toLowerCase() !== admin.email.toLowerCase()) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, settings.adminPasswordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await prisma.businessSettings.update({
      where: { id: "default" },
      data: { adminPasswordHash: newHash },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("change-password:", e);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
