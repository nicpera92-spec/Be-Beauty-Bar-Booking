import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/auth";

// Saves the order that a technician's service categories appear in on the
// booking page. The master can set it for any technician; a technician can set
// their own.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (admin.role !== "master" && admin.technicianId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { order } = body;
  if (!Array.isArray(order) || order.some((c) => typeof c !== "string")) {
    return NextResponse.json(
      { error: "order must be an array of category slugs" },
      { status: 400 }
    );
  }

  const technician = await prisma.technician.findUnique({ where: { id } });
  if (!technician) {
    return NextResponse.json({ error: "Technician not found" }, { status: 404 });
  }

  const updated = await prisma.technician.update({
    where: { id },
    data: { categoryOrder: JSON.stringify(order) },
    select: { id: true, categoryOrder: true },
  });
  return NextResponse.json(updated);
}
