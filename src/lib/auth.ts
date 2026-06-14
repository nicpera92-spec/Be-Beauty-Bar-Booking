import * as jose from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("JWT_SECRET or ADMIN_SECRET must be set in production");
  }
  return secret || "fallback-dev-only";
}
const alg = "HS256";

export type StaffRole = "master" | "technician";

export type StaffSession = {
  email: string;
  role: StaffRole;
  technicianId?: string;
  name?: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createStaffToken(session: StaffSession): Promise<string> {
  const secret = new TextEncoder().encode(getJwtSecret());
  return new jose.SignJWT({
    email: session.email,
    role: session.role,
    technicianId: session.technicianId ?? null,
    name: session.name ?? null,
  })
    .setProtectedHeader({ alg })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);
}

/** @deprecated Use createStaffToken */
export async function createAdminToken(email: string): Promise<string> {
  return createStaffToken({ email, role: "master" });
}

export async function verifyStaffToken(token: string): Promise<StaffSession | null> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jose.jwtVerify(token, secret);
    const email = payload.email as string;
    if (!email) return null;
    const role = (payload.role as StaffRole) || "master";
    const technicianId = (payload.technicianId as string) || undefined;
    const name = (payload.name as string) || undefined;
    return { email, role, technicianId, name };
  } catch {
    return null;
  }
}

/** @deprecated Use verifyStaffToken */
export async function verifyAdminToken(token: string): Promise<{ email: string } | null> {
  const session = await verifyStaffToken(token);
  return session ? { email: session.email } : null;
}

export function getAdminTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return req.headers.get("x-admin-token");
}

export async function verifyStaffRequest(req: Request): Promise<StaffSession | null> {
  const token = getAdminTokenFromRequest(req);
  if (!token) return null;
  return verifyStaffToken(token);
}

/** Any logged-in staff (master or technician). */
export async function verifyAdminRequest(req: Request): Promise<StaffSession | null> {
  return verifyStaffRequest(req);
}

/** Master only (business owner login) — technicians, settings, category rules, time off. */
export async function requireMaster(req: Request): Promise<StaffSession | null> {
  const session = await verifyStaffRequest(req);
  // The master is the business owner. She may also have a linked technician
  // profile (so she can take her own bookings), so a technicianId is allowed
  // as long as the role is master. Plain technician logins are still blocked.
  if (!session || session.role !== "master") return null;
  return session;
}

export async function validateStaffCredentials(
  email: string,
  password: string
): Promise<StaffSession | null> {
  const normalized = email.trim().toLowerCase();

  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
  });
  if (
    settings?.adminLoginEmail &&
    settings.adminPasswordHash &&
    settings.adminLoginEmail.toLowerCase() === normalized &&
    (await verifyPassword(password, settings.adminPasswordHash))
  ) {
    // Link the owner login to her technician profile (if one exists) so she
    // can also own services, appear in booking and have her own calendar —
    // all under this single login.
    const masterTech = await prisma.technician.findFirst({
      where: { role: "master" },
      orderBy: { position: "asc" },
    });
    return {
      email: settings.adminLoginEmail,
      role: "master",
      technicianId: masterTech?.id,
      name: masterTech?.name,
    };
  }

  const technician = await prisma.technician.findFirst({
    where: { loginEmail: { equals: normalized } },
  });
  if (
    technician?.loginEmail &&
    technician.passwordHash &&
    technician.active &&
    (await verifyPassword(password, technician.passwordHash))
  ) {
    return {
      email: technician.loginEmail,
      role: technician.role === "master" ? "master" : "technician",
      technicianId: technician.id,
      name: technician.name,
    };
  }

  return null;
}

/** @deprecated Use validateStaffCredentials */
export async function validateAdminCredentials(
  email: string,
  password: string
): Promise<boolean> {
  const session = await validateStaffCredentials(email, password);
  return session !== null;
}
