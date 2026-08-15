import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyDatabaseRecovered, notifyDatabaseUnreachable } from "@/lib/outageAlert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight ping so Prisma Postgres does not go unreachable after idle.
 * On failure, emails ALERT_EMAIL (at most every 2 hours). Does not change bookings.
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = req.nextUrl.searchParams.get("secret");
  if ((bearer ?? querySecret) !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    let businessEmail: string | null = null;
    try {
      const settings = await prisma.businessSettings.findUnique({
        where: { id: "default" },
        select: { businessEmail: true },
      });
      businessEmail = settings?.businessEmail ?? null;
    } catch {
      // Ping succeeded; still record recovery even if settings cannot be read.
    }
    await notifyDatabaseRecovered(businessEmail).catch((err) => {
      console.error("keep-db-awake recovery notify:", err);
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("keep-db-awake:", e);
    await notifyDatabaseUnreachable().catch((err) => {
      console.error("keep-db-awake down notify:", err);
    });
    return NextResponse.json({ error: "Database ping failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
