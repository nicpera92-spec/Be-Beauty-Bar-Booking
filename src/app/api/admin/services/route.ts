import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

function ownerTechnicianId(staff: { role: string; technicianId?: string }): string | null {
  if (staff.role === "technician" && staff.technicianId) return staff.technicianId;
  return null;
}

export async function GET(req: NextRequest) {
  const staff = await verifyAdminRequest(req);
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const techId = ownerTechnicianId(staff);
  const services = await prisma.service.findMany({
    where: techId ? { technicianId: techId } : undefined,
    include: { technician: { select: { id: true, name: true, role: true, active: true } } },
    orderBy: [{ position: "asc" }, { category: "asc" }, { name: "asc" }],
  });
  const res = NextResponse.json(services);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

export async function POST(req: NextRequest) {
  const staff = await verifyAdminRequest(req);
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, category, durationMin, price, depositAmount, description, technicianId } = body;

  if (!name || !category || durationMin == null) {
    return NextResponse.json(
      { error: "name, category, durationMin required" },
      { status: 400 }
    );
  }

  const techId =
    staff.role === "technician" && staff.technicianId
      ? staff.technicianId
      : technicianId
        ? String(technicianId)
        : null;

  if (!techId) {
    return NextResponse.json({ error: "technicianId required" }, { status: 400 });
  }

  const technician = await prisma.technician.findUnique({
    where: { id: techId },
    select: { id: true, active: true },
  });
  if (!technician) {
    return NextResponse.json({ error: "Technician not found" }, { status: 404 });
  }

  // Whoever owns the service sets its price/deposit. If not supplied, fall back
  // to the business defaults.
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
  });
  const p = price != null ? Number(price) : settings?.defaultPrice ?? 0;
  const d = depositAmount != null ? Number(depositAmount) : settings?.defaultDepositAmount ?? 0;
  if (d > p) {
    return NextResponse.json(
      { error: "Deposit cannot exceed full price" },
      { status: 400 }
    );
  }

  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const id = `${slug}-${Date.now().toString(36)}`;

  const maxPosition = await prisma.service
    .aggregate({
      where: { technicianId: techId },
      _max: { position: true },
    })
    .then((r) => (r._max.position ?? -1) + 1);

  const service = await prisma.service.create({
    data: {
      id,
      technicianId: techId,
      name,
      category,
      position: maxPosition,
      durationMin: Number(durationMin),
      price: p,
      depositAmount: d,
      description: description ?? "",
    },
  });
  return NextResponse.json(service);
}

export async function PUT(req: NextRequest) {
  const staff = await verifyAdminRequest(req);
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { ids } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  const techId = ownerTechnicianId(staff);
  if (techId) {
    const owned = await prisma.service.findMany({
      where: { id: { in: ids.map(String) } },
      select: { id: true, technicianId: true },
    });
    if (owned.some((s) => s.technicianId !== techId)) {
      return NextResponse.json({ error: "Cannot reorder another technician's services" }, { status: 403 });
    }
  }

  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.service.update({
        where: { id: String(id) },
        data: { position: index },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
