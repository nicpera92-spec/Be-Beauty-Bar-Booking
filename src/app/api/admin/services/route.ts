import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const services = await prisma.service.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const res = NextResponse.json(services);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, category, durationMin, price, depositAmount, description } = body;

  if (!name || !category || durationMin == null || price == null || depositAmount == null) {
    return NextResponse.json(
      { error: "name, category, durationMin, price, depositAmount required" },
      { status: 400 }
    );
  }

  const p = Number(price);
  const d = Number(depositAmount);
  if (d > p) {
    return NextResponse.json(
      { error: "Deposit cannot exceed full price" },
      { status: 400 }
    );
  }

  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const id = `${slug}-${Date.now().toString(36)}`;

  const service = await prisma.service.create({
    data: {
      id,
      name,
      category,
      durationMin: Number(durationMin),
      price: p,
      depositAmount: d,
      description: description ?? "",
    },
  });
  return NextResponse.json(service);
}
