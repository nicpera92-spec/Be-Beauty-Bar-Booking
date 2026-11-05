import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { toPublicSettings } from "@/lib/publicSettings";

const BUSINESS_SETTINGS_TAG = "business-settings";

/**
 * Public (secret-free) business settings, cached across requests so pages don't wait on the
 * database. Cleared on every settings save via invalidateBusinessSettingsCache().
 */
export const getCachedPublicSettings = unstable_cache(
  async () => {
    const settings = await prisma.businessSettings.findUnique({ where: { id: "default" } });
    return settings ? toPublicSettings(settings as unknown as Record<string, unknown>) : null;
  },
  ["public-business-settings"],
  { tags: [BUSINESS_SETTINGS_TAG], revalidate: 300 }
);

export function invalidateBusinessSettingsCache(): void {
  revalidateTag(BUSINESS_SETTINGS_TAG);
}
