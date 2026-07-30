import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth";
import { categoryLabel, normalizeExclusionPair } from "@/lib/categoryCapacity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.categoryExclusionRule.findMany({
    orderBy: [{ categoryA: "asc" }, { categoryB: "asc" }],
  });

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      categoryA: r.categoryA,
      categoryB: r.categoryB,
      labelA: categoryLabel(r.categoryA),
      labelB: categoryLabel(r.categoryB),
    }))
  );
}

export async function PUT(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { exclusions } = body;
  if (!Array.isArray(exclusions)) {
    return NextResponse.json({ error: "exclusions array required" }, { status: 400 });
  }

  const normalized: { categoryA: string; categoryB: string }[] = [];
  const seen = new Set<string>();
  for (const row of exclusions) {
    const pair = normalizeExclusionPair(row.categoryA, row.categoryB);
    if (!pair) {
      return NextResponse.json(
        { error: "Each rule needs two different categories" },
        { status: 400 }
      );
    }
    const key = `${pair.categoryA}::${pair.categoryB}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(pair);
  }

  await prisma.$transaction(async (tx) => {
    await tx.categoryExclusionRule.deleteMany();
    if (normalized.length > 0) {
      await tx.categoryExclusionRule.createMany({ data: normalized });
    }
  });

  return NextResponse.json({ ok: true });
}
