import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster, hashPassword } from "@/lib/auth";
import { normalizeInstagramHandle } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json(
      { error: "Only the master (business owner) account can manage technicians" },
      { status: 403 }
    );
  }
  const technicians = await prisma.technician.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
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
      categoryOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const res = NextResponse.json(technicians);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

export async function POST(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json(
      { error: "Only the master (business owner) account can manage technicians" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { name, bio, skillLevel, loginEmail, password, instagramHandle } = body;

  if (!name || String(name).trim() === "") {
    return NextResponse.json({ error: "Technician name is required" }, { status: 400 });
  }

  const emailNorm = loginEmail ? String(loginEmail).trim().toLowerCase() : null;
  if (emailNorm) {
    const clash = await prisma.technician.findFirst({ where: { loginEmail: emailNorm } });
    if (clash) {
      return NextResponse.json({ error: "Login email already in use" }, { status: 400 });
    }
  }

  const maxPosition = await prisma.technician
    .aggregate({ _max: { position: true } })
    .then((r) => (r._max.position ?? -1) + 1);

  const instagramNorm =
    instagramHandle != null && String(instagramHandle).trim() !== ""
      ? normalizeInstagramHandle(String(instagramHandle))
      : null;

  const technician = await prisma.technician.create({
    data: {
      name: String(name).trim(),
      bio: bio == null ? "" : String(bio),
      skillLevel: skillLevel == null ? "" : String(skillLevel),
      instagramHandle: instagramNorm,
      role: "technician",
      loginEmail: emailNorm,
      passwordHash: password ? await hashPassword(String(password)) : null,
      position: maxPosition,
    },
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
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(technician);
}

export async function PUT(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json(
      { error: "Only the master (business owner) account can manage technicians" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { ids } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.technician.update({
        where: { id: String(id) },
        data: { position: index },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
