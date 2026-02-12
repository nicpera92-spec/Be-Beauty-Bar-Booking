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
  const { name, category, durationMin, price, depositAmount, description, active } = body;

  const current = await prisma.service.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const data: {
    name?: string;
    category?: string;
    durationMin?: number;
    price?: number;
    depositAmount?: number;
    description?: string | null;
    active?: boolean;
  } = {};

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (trimmed === "") {
      return NextResponse.json({ error: "Service name cannot be empty" }, { status: 400 });
    }
    data.name = trimmed;
  }
  if (category !== undefined) {
    const trimmed = String(category).trim();
    if (trimmed === "") {
      return NextResponse.json({ error: "Category cannot be empty" }, { status: 400 });
    }
    data.category = trimmed;
  }
  if (durationMin !== undefined) data.durationMin = Number(durationMin);
  if (price !== undefined) data.price = Number(price);
  if (depositAmount !== undefined) data.depositAmount = Number(depositAmount);
  if (description !== undefined) data.description = description === null ? "" : String(description);
  if (active !== undefined) data.active = Boolean(active);

  if (Object.keys(data).length === 0) {
    return NextResponse.json(current);
  }

  const newPrice = data.price ?? current.price;
  const newDeposit = data.depositAmount ?? current.depositAmount;
  if (newDeposit > newPrice) {
    return NextResponse.json(
      { error: "Deposit cannot exceed full price" },
      { status: 400 }
    );
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
