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
  const body = await req.json();
  const { name, category, durationMin, price, depositAmount, description, active } = body;

  const data: {
    name?: string;
    category?: string;
    durationMin?: number;
    price?: number;
    depositAmount?: number;
    description?: string | null;
    active?: boolean;
  } = {};
  if (name != null && String(name).trim() !== "") data.name = String(name).trim();
  if (category != null && String(category).trim() !== "") data.category = String(category).trim();
  if (durationMin != null) data.durationMin = Number(durationMin);
  if (price != null) data.price = Number(price);
  if (depositAmount != null) data.depositAmount = Number(depositAmount);
  if (description != null) data.description = description === "" ? "" : String(description);
  if (active !== undefined) data.active = Boolean(active);

  if (Object.keys(data).length === 0) {
    const current = await prisma.service.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    return NextResponse.json(current);
  }

  if (data.price != null || data.depositAmount != null) {
    const current = await prisma.service.findUnique({ where: { id } });
    if (current) {
      const p = data.price ?? current.price;
      const d = data.depositAmount ?? current.depositAmount;
      if (d > p) {
        return NextResponse.json(
          { error: "Deposit cannot exceed full price" },
          { status: 400 }
        );
      }
    }
  }

  const service = await prisma.service.update({
    where: { id },
    data,
  });
  return NextResponse.json(service);
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
  // Only block removal if there are active bookings (pending or confirmed), not cancelled
  const activeBookingCount = await prisma.booking.count({
    where: {
      serviceId: id,
      status: { in: ["pending_deposit", "confirmed"] },
    },
  });
  if (activeBookingCount > 0) {
    return NextResponse.json(
      { error: "Cannot remove a service that has bookings. Hide it instead." },
      { status: 400 }
    );
  }
  // Delete cancelled bookings that reference this service so the DB allows the service delete (foreign key)
  await prisma.booking.deleteMany({
    where: { serviceId: id, status: "cancelled" },
  });
  await prisma.service.delete({
    where: { id },
  });
  return NextResponse.json({ ok: true });
}
