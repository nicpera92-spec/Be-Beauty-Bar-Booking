import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET: Check if admin token is valid. Returns { ok: true } or 401. */
export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Admin session invalid or expired." }, { status: 401 });
  }

  let technicianId = admin.technicianId ?? null;
  if (admin.role === "master" && !technicianId) {
    const ownerTechnician = await prisma.technician.findFirst({
      where: { role: "master" },
      orderBy: { position: "asc" },
      select: { id: true, name: true },
    });
    technicianId = ownerTechnician?.id ?? null;
  }

  return NextResponse.json({
    ok: true,
    email: admin.email,
    role: admin.role,
    technicianId,
    name: admin.name ?? null,
  });
}
