import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json({ error: "Only the owner can manage the waiting list" }, { status: 403 });
  }

  const entry = await prisma.waitingListEntry.findUnique({ where: { id: params.id } });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.waitingListEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
