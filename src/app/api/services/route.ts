import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(services);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
