import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderCategories } from "@/lib/categoryOrder";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const technicians = await prisma.technician.findMany({
      where: { active: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: {
        services: {
          where: { active: true },
          select: { category: true },
        },
      },
    });

    const payload = technicians.map(({ services, ...technician }) => {
      const uniqueCategories = [...new Set(services.map((s) => s.category))];
      return {
        ...technician,
        categories: orderCategories(uniqueCategories, technician.categoryOrder),
      };
    });

    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch technicians" }, { status: 500 });
  }
}
