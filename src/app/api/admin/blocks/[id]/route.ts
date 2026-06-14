import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const block = await prisma.availabilityBlock.findUnique({ where: { id } });
  if (!block) {
    return NextResponse.json({ error: "Time off not found" }, { status: 404 });
  }

  // Technicians may only remove their own time off; the master may only remove
  // salon-wide time off (their own scope).
  const ownerTechnicianId =
    admin.role === "technician" && admin.technicianId ? admin.technicianId : null;
  if (block.technicianId !== ownerTechnicianId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.availabilityBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
