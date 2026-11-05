import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth";
import { parseGiftPackageInput } from "@/lib/giftPackages";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can manage gift packages" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (Object.keys(body ?? {}).length === 1 && typeof body?.active === "boolean") {
    const updated = await prisma.giftPackage.update({ where: { id: params.id }, data: { active: body.active } });
    return NextResponse.json(updated);
  }
  const parsed = await parseGiftPackageInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const updated = await prisma.giftPackage.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can manage gift packages" }, { status: 403 });
  await prisma.giftPackage.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
