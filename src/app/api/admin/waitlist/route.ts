import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest, requireMaster } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json({ error: "Only the owner can view the waiting list" }, { status: 403 });
  }

  const entries = await prisma.waitingListEntry.findMany({
    orderBy: [{ preferredDate: "asc" }, { createdAt: "asc" }],
    include: {
      service: { select: { name: true } },
      technician: { select: { name: true } },
    },
  });

  return NextResponse.json(entries);
}
