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
          openHour: 9,
          closeHour: 17,
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
