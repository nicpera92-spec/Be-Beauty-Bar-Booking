import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { serviceId, name, price } = body;

  if (!serviceId || !name?.trim() || price == null) {
    return NextResponse.json(
      { error: "serviceId, name, and price required" },
      { status: 400 }
    );
  }

  const p = Number(price);
  if (p < 0 || isNaN(p)) {
    return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const addOn = await prisma.addOn.create({
    data: {
      serviceId,
      name: String(name).trim(),
      price: p,
    },
  });
  return NextResponse.json(addOn);
}
