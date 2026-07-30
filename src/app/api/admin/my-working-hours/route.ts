import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyStaffRequest } from "@/lib/auth";
import { parseWorkingHours, validateWorkingHoursPayload } from "@/lib/workingHours";

export const dynamic = "force-dynamic";

async function salonDefaults() {
  const settings = await prisma.businessSettings.findUnique({ where: { id: "default" } });
  return {
    openTime: settings?.openTime ?? "09:00",
    closeTime: settings?.closeTime ?? "17:00",
  };
}

/** Logged-in technician (or master with linked profile) — own weekly hours. */
export async function GET(req: NextRequest) {
  const session = await verifyStaffRequest(req);
  if (!session?.technicianId) {
    return NextResponse.json(
      { error: "No technician profile linked to this login" },
      { status: 403 }
    );
  }

  const [tech, salon] = await Promise.all([
    prisma.technician.findUnique({
      where: { id: session.technicianId },
      select: { id: true, name: true, workingHours: true },
    }),
    salonDefaults(),
  ]);

  if (!tech) {
    return NextResponse.json({ error: "Technician not found" }, { status: 404 });
  }

  const workingHours = parseWorkingHours(tech.workingHours, salon.openTime, salon.closeTime);

  return NextResponse.json({
    technicianId: tech.id,
    name: tech.name,
    workingHours,
    salonOpen: salon.openTime,
    salonClose: salon.closeTime,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await verifyStaffRequest(req);
  if (!session?.technicianId) {
    return NextResponse.json(
      { error: "No technician profile linked to this login" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const validated = validateWorkingHoursPayload(body.workingHours);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const tech = await prisma.technician.update({
    where: { id: session.technicianId },
    data: { workingHours: validated.hours },
    select: { id: true, name: true, workingHours: true },
  });

  const salon = await salonDefaults();
  return NextResponse.json({
    technicianId: tech.id,
    name: tech.name,
    workingHours: parseWorkingHours(tech.workingHours, salon.openTime, salon.closeTime),
    salonOpen: salon.openTime,
    salonClose: salon.closeTime,
  });
}
