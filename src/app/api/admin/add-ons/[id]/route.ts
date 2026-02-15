import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const { name, price } = body;

  const current = await prisma.addOn.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Add-on not found" }, { status: 404 });
  }

  const data: { name?: string; price?: number } = {};
  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (trimmed === "") {
      return NextResponse.json({ error: "Add-on name cannot be empty" }, { status: 400 });
    }
    data.name = trimmed;
  }
  if (price !== undefined) {
    const p = Number(price);
    if (p < 0 || isNaN(p)) {
      return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 });
    }
    data.price = p;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(current);
  }

  const addOn = await prisma.addOn.update({
    where: { id },
    data,
  });
  return NextResponse.json(addOn);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  await prisma.addOn.delete({
    where: { id },
  });
  return NextResponse.json({ ok: true });
}
