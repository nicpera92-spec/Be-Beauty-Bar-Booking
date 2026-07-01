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

  // Each person may only remove their own time off.
  if (!admin.technicianId || block.technicianId !== admin.technicianId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const technicianId = block.technicianId;
  const { startDate, endDate } = block;

  await prisma.availabilityBlock.delete({ where: { id } });

  if (technicianId) {
    const { notifyWaitlistAfterTimeOffRemoved } = await import("@/lib/waitlist");
    await notifyWaitlistAfterTimeOffRemoved(technicianId, startDate, endDate);
  }

  return NextResponse.json({ ok: true });
}
