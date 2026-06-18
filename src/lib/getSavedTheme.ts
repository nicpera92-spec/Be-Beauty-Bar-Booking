import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  themeColorsToCssVars,
} from "@/lib/themePalettes";

/** Load saved theme colours from the database (always fresh — not statically cached). */
export async function getSavedThemeCssVars(): Promise<Record<string, string>> {
  noStore();
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: { id: "default" },
    });
    return themeColorsToCssVars(
      settings?.primaryColor ?? DEFAULT_PRIMARY,
      settings?.secondaryColor ?? DEFAULT_SECONDARY
    );
  } catch {
    return themeColorsToCssVars(DEFAULT_PRIMARY, DEFAULT_SECONDARY);
  }
}
