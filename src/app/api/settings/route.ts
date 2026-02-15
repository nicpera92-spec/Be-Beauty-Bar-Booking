import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let settings = await prisma.businessSettings.findUnique({
      where: { id: "default" },
    });
    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          id: "default",
          businessName: "Be Beauty Bar",
          openTime: "09:00",
          closeTime: "17:00",
          slotInterval: 30,
        },
      });
    }
    return NextResponse.json(settings);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}
