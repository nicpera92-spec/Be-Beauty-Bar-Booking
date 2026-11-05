import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth";
import { parseGiftPackageInput } from "@/lib/giftPackages";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can manage gift packages" }, { status: 403 });
  const packages = await prisma.giftPackage.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json(packages, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) return NextResponse.json({ error: "Only the owner can manage gift packages" }, { status: 403 });
  const parsed = await parseGiftPackageInput(await req.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const count = await prisma.giftPackage.count();
  const created = await prisma.giftPackage.create({ data: { ...parsed.data, position: count } });
  return NextResponse.json(created);
}
