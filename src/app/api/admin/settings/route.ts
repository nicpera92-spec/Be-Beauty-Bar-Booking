import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest, requireMaster } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const staff = await verifyAdminRequest(req);
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
  });
  if (!settings) {
    return NextResponse.json({ error: "Settings not found" }, { status: 404 });
  }
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const master = await requireMaster(req);
  if (!master) {
    return NextResponse.json({ error: "Only the master account can change business settings" }, { status: 403 });
  }

  const body = await req.json();
  const {
    businessName,
    businessEmail,
    instagramHandle,
    defaultDepositAmount,
    defaultPrice,
    openTime,
    closeTime,
    slotInterval,
    stripeSecretKey,
    stripeWebhookSecret,
    smsNotificationFee,
    primaryColor,
    secondaryColor,
  } = body;

  const hexColor = /^#[0-9a-fA-F]{6}$/;
  const data: Record<string, unknown> = {};
  if (primaryColor != null) {
    if (!hexColor.test(String(primaryColor))) {
      return NextResponse.json({ error: "Invalid primary colour" }, { status: 400 });
    }
    data.primaryColor = String(primaryColor);
  }
  if (secondaryColor != null) {
    if (!hexColor.test(String(secondaryColor))) {
      return NextResponse.json({ error: "Invalid secondary colour" }, { status: 400 });
    }
    data.secondaryColor = String(secondaryColor);
  }
  if (businessName != null) data.businessName = businessName;
  if (businessEmail != null) data.businessEmail = businessEmail === "" ? null : businessEmail;
  if (instagramHandle != null) data.instagramHandle = instagramHandle === "" ? null : instagramHandle;
  if (defaultDepositAmount != null) data.defaultDepositAmount = defaultDepositAmount === "" ? null : Number(defaultDepositAmount);
  if (defaultPrice != null) data.defaultPrice = defaultPrice === "" ? null : Number(defaultPrice);
  const timeRegex = /^\d{2}:00$/; // only full hours allowed, e.g. 09:00
  if (openTime != null) {
    const t = String(openTime);
    if (!timeRegex.test(t)) {
      return NextResponse.json(
        { error: "Open time must be a whole hour, e.g. 09:00" },
        { status: 400 }
      );
    }
    data.openTime = t;
  }
  if (closeTime != null) {
    const t = String(closeTime);
    if (!timeRegex.test(t)) {
      return NextResponse.json(
        { error: "Close time must be a whole hour, e.g. 17:00" },
        { status: 400 }
      );
    }
    data.closeTime = t;
  }
  if (slotInterval != null) data.slotInterval = Number(slotInterval);
  // Only update Stripe keys if a new value is provided (empty string means clear, undefined means don't change)
  if (stripeSecretKey !== undefined) {
    data.stripeSecretKey = stripeSecretKey === "" ? null : stripeSecretKey;
  }
  if (stripeWebhookSecret !== undefined) {
    data.stripeWebhookSecret = stripeWebhookSecret === "" ? null : stripeWebhookSecret;
  }
  if (smsNotificationFee != null) data.smsNotificationFee = Number(smsNotificationFee);

  try {
    const settings = await prisma.businessSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        businessName: (data.businessName as string) ?? "Be Beauty Bar",
        businessEmail: (data.businessEmail as string | null) ?? null,
        instagramHandle: (data.instagramHandle as string | null) ?? null,
        defaultDepositAmount: (data.defaultDepositAmount as number | null) ?? null,
        defaultPrice: (data.defaultPrice as number | null) ?? null,
        openTime: (data.openTime as string) ?? "09:00",
        closeTime: (data.closeTime as string) ?? "17:00",
        slotInterval: (data.slotInterval as number) ?? 30,
        primaryColor: (data.primaryColor as string) ?? "#1e3a5f",
        secondaryColor: (data.secondaryColor as string) ?? "#2c5282",
        stripeSecretKey: (data.stripeSecretKey as string | null) ?? null,
        stripeWebhookSecret: (data.stripeWebhookSecret as string | null) ?? null,
        smsNotificationFee: (data.smsNotificationFee as number | null) ?? 0.05,
      },
      update: data,
    });
    revalidatePath("/", "layout");
    return NextResponse.json(settings);
  } catch (e) {
    console.error("Failed to save business settings:", e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
