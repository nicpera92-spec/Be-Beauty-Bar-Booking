import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth";
import { DEFAULT_CATEGORY_RULES, categoryLabel } from "@/lib/categoryCapacity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await prisma.categoryCapacityRule.findMany({
    orderBy: { category: "asc" },
  });

  const byCategory = new Map(rules.map((r) => [r.category, r]));
  const merged = DEFAULT_CATEGORY_RULES.map((d) => {
    const existing = byCategory.get(d.category);
    return {
      category: d.category,
      label: categoryLabel(d.category),
      maxConcurrent: existing?.maxConcurrent ?? d.maxConcurrent,
      id: existing?.id ?? null,
    };
  });

  // Include custom categories from services not in defaults
  const serviceCategories = await prisma.service.findMany({
    select: { category: true },
    distinct: ["category"],
  });
  for (const { category } of serviceCategories) {
    if (!merged.some((m) => m.category === category)) {
      const existing = byCategory.get(category);
      merged.push({
        category,
        label: categoryLabel(category),
        maxConcurrent: existing?.maxConcurrent ?? 1,
        id: existing?.id ?? null,
      });
    }
  }

  merged.sort((a, b) => a.label.localeCompare(b.label));
  return NextResponse.json(merged);
}

export async function PUT(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { rules } = body;
  if (!Array.isArray(rules)) {
    return NextResponse.json({ error: "rules array required" }, { status: 400 });
  }

  for (const r of rules) {
    const category = String(r.category ?? "").trim();
    const maxConcurrent = Number(r.maxConcurrent);
    if (!category || !Number.isFinite(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 20) {
      return NextResponse.json(
        { error: `Invalid rule for category "${category}"` },
        { status: 400 }
      );
    }
    await prisma.categoryCapacityRule.upsert({
      where: { category },
      create: { category, maxConcurrent },
      update: { maxConcurrent },
    });
  }

  return NextResponse.json({ ok: true });
}
