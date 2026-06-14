import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster, hashPassword } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json(
      { error: "Only the master (business owner) account can manage technicians" },
      { status: 403 }
    );
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const { name, bio, skillLevel, active, loginEmail, password } = body;

  const current = await prisma.technician.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Technician not found" }, { status: 404 });
  }

  const data: {
    name?: string;
    bio?: string;
    skillLevel?: string;
    active?: boolean;
    role?: string;
    loginEmail?: string | null;
    passwordHash?: string;
  } = {};

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (trimmed === "") {
      return NextResponse.json({ error: "Technician name cannot be empty" }, { status: 400 });
    }
    data.name = trimmed;
  }
  if (bio !== undefined) data.bio = bio === null ? "" : String(bio);
  if (skillLevel !== undefined) data.skillLevel = skillLevel === null ? "" : String(skillLevel);
  if (active !== undefined) data.active = Boolean(active);
  // The master (owner) signs in with the business-owner login managed in
  // Business settings, not with a technician login. Ignore credential edits
  // on her profile so there is only ever one set of master credentials.
  const isMaster = current.role === "master";
  if (!isMaster && loginEmail !== undefined) {
    const emailNorm = loginEmail ? String(loginEmail).trim().toLowerCase() : null;
    if (emailNorm) {
      const clash = await prisma.technician.findFirst({
        where: { loginEmail: emailNorm, NOT: { id } },
      });
      if (clash) {
        return NextResponse.json({ error: "Login email already in use" }, { status: 400 });
      }
    }
    data.loginEmail = emailNorm;
  }
  if (!isMaster && password !== undefined && password !== "") {
    data.passwordHash = await hashPassword(String(password));
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({
      id: current.id,
      name: current.name,
      bio: current.bio,
      skillLevel: current.skillLevel,
      role: current.role,
      loginEmail: current.loginEmail,
      position: current.position,
      active: current.active,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
    });
  }

  const technician = await prisma.technician.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      bio: true,
      skillLevel: true,
      role: true,
      loginEmail: true,
      position: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(technician);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json(
      { error: "Only the master (business owner) account can manage technicians" },
      { status: 403 }
    );
  }
  const { id } = params;

  const target = await prisma.technician.findUnique({ where: { id } });
  if (target?.role === "master") {
    return NextResponse.json(
      { error: "The master (business owner) profile cannot be removed." },
      { status: 400 }
    );
  }

  const activeBookings = await prisma.booking.count({
    where: {
      technicianId: id,
      status: { in: ["pending_deposit", "confirmed"] },
    },
  });
  if (activeBookings > 0) {
    return NextResponse.json(
      { error: "Cannot remove a technician with active bookings. Hide them instead." },
      { status: 400 }
    );
  }

  await prisma.booking.deleteMany({
    where: { technicianId: id, status: "cancelled" },
  });
  await prisma.service.deleteMany({ where: { technicianId: id } });
  await prisma.technician.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
