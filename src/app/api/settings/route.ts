import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPublicSettings } from "@/lib/publicSettings";
import { getCachedPublicSettings, invalidateBusinessSettingsCache } from "@/lib/cachedSettings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    let settings = await getCachedPublicSettings();
    if (!settings) {
      const created = await prisma.businessSettings.create({
        data: {
          id: "default",
          businessName: "Be Beauty Bar",
          openTime: "09:00",
          closeTime: "17:00",
          slotInterval: 30,
        },
      });
      invalidateBusinessSettingsCache();
      settings = toPublicSettings(created as unknown as Record<string, unknown>);
    }
    return NextResponse.json(settings, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 503 });
  }
}
