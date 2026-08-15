import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRetryableDbError } from "@/lib/databaseUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public health check used to verify the HTTPS database driver.
 * Does not return connection strings, bookings, or login data.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { ok: true, driver: "prisma-postgres-https" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("health:", e);
    const unreachable = isRetryableDbError(e);
    return NextResponse.json(
      {
        ok: false,
        driver: "prisma-postgres-https",
        reason: unreachable ? "database_unreachable" : "database_error",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
