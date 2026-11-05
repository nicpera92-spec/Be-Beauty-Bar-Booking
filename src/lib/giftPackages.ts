import { prisma } from "@/lib/prisma";
import { MAX_CERTIFICATE_ITEMS } from "@/lib/giftVoucherRules";

export type GiftPackageData = {
  name: string;
  description: string;
  price: number;
  serviceIds: string[];
  active: boolean;
};

/** Validates an owner's combo package (2+ existing treatments, a price of at least £1). */
export async function parseGiftPackageInput(
  body: unknown
): Promise<{ ok: true; data: GiftPackageData } | { ok: false; error: string }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 100) : "";
  if (!name) return { ok: false, error: "Give the package a name." };
  const serviceIds = Array.isArray(b.serviceIds)
    ? b.serviceIds.filter((id): id is string => typeof id === "string")
    : [];
  if (serviceIds.length < 2) return { ok: false, error: "A combo needs at least two treatments." };
  if (serviceIds.length > MAX_CERTIFICATE_ITEMS) {
    return { ok: false, error: `A combo can hold up to ${MAX_CERTIFICATE_ITEMS} treatments.` };
  }
  const found = await prisma.service.count({ where: { id: { in: [...new Set(serviceIds)] } } });
  if (found !== new Set(serviceIds).size) return { ok: false, error: "One of those treatments no longer exists." };
  const price = Math.round(Number(b.price) * 100) / 100;
  if (!Number.isFinite(price) || price < 1) return { ok: false, error: "Enter a package price of at least £1." };
  return {
    ok: true,
    data: {
      name,
      description: typeof b.description === "string" ? b.description.trim().slice(0, 300) : "",
      price,
      serviceIds,
      active: b.active !== false,
    },
  };
}
