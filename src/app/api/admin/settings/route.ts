import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
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
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    businessName,
    businessEmail,
    instagramHandle,
    defaultDepositAmount,
    defaultPrice,
    openHour,
    closeHour,
    slotInterval,
    stripeSecretKey,
    stripeWebhookSecret,
    smsNotificationFee,
  } = body;

  const data: Record<string, unknown> = {};
  if (businessName != null) data.businessName = businessName;
  if (businessEmail != null) data.businessEmail = businessEmail === "" ? null : businessEmail;
  if (instagramHandle != null) data.instagramHandle = instagramHandle === "" ? null : instagramHandle;
  if (defaultDepositAmount != null) data.defaultDepositAmount = defaultDepositAmount === "" ? null : Number(defaultDepositAmount);
  if (defaultPrice != null) data.defaultPrice = defaultPrice === "" ? null : Number(defaultPrice);
  if (openHour != null) data.openHour = Number(openHour);
  if (closeHour != null) data.closeHour = Number(closeHour);
  if (slotInterval != null) data.slotInterval = Number(slotInterval);
  // Only update Stripe keys if a new value is provided (empty string means clear, undefined means don't change)
  if (stripeSecretKey !== undefined) {
    data.stripeSecretKey = stripeSecretKey === "" ? null : stripeSecretKey;
  }
  if (stripeWebhookSecret !== undefined) {
    data.stripeWebhookSecret = stripeWebhookSecret === "" ? null : stripeWebhookSecret;
  }
  if (smsNotificationFee != null) data.smsNotificationFee = Number(smsNotificationFee);

  const settings = await prisma.businessSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      businessName: (data.businessName as string) ?? "Be Beauty Bar",
      businessEmail: (data.businessEmail as string | null) ?? null,
      instagramHandle: (data.instagramHandle as string | null) ?? null,
      defaultDepositAmount: (data.defaultDepositAmount as number | null) ?? null,
      defaultPrice: (data.defaultPrice as number | null) ?? null,
      openHour: (data.openHour as number) ?? 9,
      closeHour: (data.closeHour as number) ?? 17,
      slotInterval: (data.slotInterval as number) ?? 30,
      primaryColor: "#1e3a5f",
      secondaryColor: "#2c5282",
      stripeSecretKey: (data.stripeSecretKey as string | null) ?? null,
      stripeWebhookSecret: (data.stripeWebhookSecret as string | null) ?? null,
      smsNotificationFee: (data.smsNotificationFee as number | null) ?? 0.05,
    },
    update: data,
  });
  return NextResponse.json(settings);
}
