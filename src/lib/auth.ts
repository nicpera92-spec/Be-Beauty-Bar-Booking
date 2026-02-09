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

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createAdminToken(email: string): Promise<string> {
  const secret = new TextEncoder().encode(getJwtSecret());
  return new jose.SignJWT({ email })
    .setProtectedHeader({ alg })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);
}

export async function verifyAdminToken(token: string): Promise<{ email: string } | null> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jose.jwtVerify(token, secret);
    const email = payload.email as string;
    if (!email) return null;
    return { email };
  } catch {
    return null;
  }
}

export function getAdminTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return req.headers.get("x-admin-token");
}

export async function verifyAdminRequest(req: Request): Promise<{ email: string } | null> {
  const token = getAdminTokenFromRequest(req);
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function validateAdminCredentials(
  email: string,
  password: string
): Promise<boolean> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
  });
  if (!settings?.adminLoginEmail || !settings?.adminPasswordHash) return false;
  if (settings.adminLoginEmail.toLowerCase() !== email.toLowerCase()) return false;
  return verifyPassword(password, settings.adminPasswordHash);
}
