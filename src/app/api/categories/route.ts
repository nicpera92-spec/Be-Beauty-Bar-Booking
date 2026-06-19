import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderCategories } from "@/lib/categoryOrder";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: {
        active: true,
        technician: { active: true },
      },
      select: { category: true },
    });

    const unique = [...new Set(services.map((s) => s.category))];
    const categories = orderCategories(unique, null);

    const res = NextResponse.json({ categories });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
