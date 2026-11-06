import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMaster, hashPassword } from "@/lib/auth";
import { normalizeInstagramHandle } from "@/lib/instagram";
import { parseWorkingHours, validateWorkingHoursPayload } from "@/lib/workingHours";
import { businessDateStr } from "@/lib/business-time";
import { formatBookingDateFriendly } from "@/lib/format";

async function salonDefaults() {
  const settings = await prisma.businessSettings.findUnique({ where: { id: "default" } });
  return {
    openTime: settings?.openTime ?? "09:00",
    closeTime: settings?.closeTime ?? "17:00",
  };
}

function serializeTech(
  tech: {
    id: string;
    name: string;
    bio: string | null;
    skillLevel: string | null;
    instagramHandle: string | null;
    role: string;
    loginEmail: string | null;
    position: number;
    active: boolean;
    workingHours: unknown;
    createdAt: Date;
    updatedAt: Date;
  },
  salonOpen: string,
  salonClose: string
) {
  return {
    id: tech.id,
    name: tech.name,
    bio: tech.bio,
    skillLevel: tech.skillLevel,
    instagramHandle: tech.instagramHandle,
    role: tech.role,
    loginEmail: tech.loginEmail,
    position: tech.position,
    active: tech.active,
    workingHours: parseWorkingHours(tech.workingHours, salonOpen, salonClose),
    createdAt: tech.createdAt,
    updatedAt: tech.updatedAt,
  };
}

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
  const { name, bio, skillLevel, active, loginEmail, password, instagramHandle, workingHours } =
    body;

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
    instagramHandle?: string | null;
    workingHours?: Prisma.InputJsonValue;
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
  if (instagramHandle !== undefined) {
    data.instagramHandle =
      instagramHandle == null || String(instagramHandle).trim() === ""
        ? null
        : normalizeInstagramHandle(String(instagramHandle));
  }
  if (active !== undefined) data.active = Boolean(active);
  if (workingHours !== undefined) {
    const validated = validateWorkingHoursPayload(workingHours);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    data.workingHours = validated.hours;
  }
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

  const salon = await salonDefaults();

  if (Object.keys(data).length === 0) {
    return NextResponse.json(serializeTech(current, salon.openTime, salon.closeTime));
  }

  const technician = await prisma.technician.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      bio: true,
      skillLevel: true,
      instagramHandle: true,
      role: true,
      loginEmail: true,
      position: true,
      active: true,
      workingHours: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(serializeTech(technician, salon.openTime, salon.closeTime));
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
  if (!target || target.removedAt) {
    return NextResponse.json({ error: "Technician not found" }, { status: 404 });
  }
  if (target.role === "master") {
    return NextResponse.json(
      { error: "The master (business owner) profile cannot be removed." },
      { status: 400 }
    );
  }

  const upcoming = await prisma.booking.findMany({
    where: {
      technicianId: id,
      status: { in: ["pending_deposit", "confirmed"] },
      date: { gte: businessDateStr() },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    select: { date: true, startTime: true },
  });
  if (upcoming.length > 0) {
    const next = upcoming[0];
    return NextResponse.json(
      {
        error: `${target.name} still has ${upcoming.length} upcoming appointment${upcoming.length === 1 ? "" : "s"} (next: ${formatBookingDateFriendly(next.date)} at ${next.startTime}). Move or cancel ${upcoming.length === 1 ? "it" : "them"} first, or hide ${target.name} instead.`,
      },
      { status: 400 }
    );
  }

  // Past bookings and sold gift certificates point at this technician's services,
  // so a technician with any history is archived rather than deleted.
  const [bookingCount, certificateCount] = await Promise.all([
    prisma.booking.count({ where: { technicianId: id } }),
    prisma.giftCertificateItem.count({ where: { service: { technicianId: id } } }),
  ]);

  if (bookingCount === 0 && certificateCount === 0) {
    await prisma.technician.delete({ where: { id } });
    return NextResponse.json({ ok: true, archived: false });
  }

  await prisma.$transaction([
    prisma.waitingListEntry.updateMany({
      where: { technicianId: id, status: "active" },
      data: { status: "expired" },
    }),
    prisma.service.updateMany({ where: { technicianId: id }, data: { active: false } }),
    prisma.technician.update({
      where: { id },
      data: { removedAt: new Date(), active: false, loginEmail: null, passwordHash: null },
    }),
  ]);
  return NextResponse.json({ ok: true, archived: true });
}
