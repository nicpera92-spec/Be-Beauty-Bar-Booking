import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  findThemePalette,
  isDarkPageGradient,
  themeColorsToCssVars,
} from "@/lib/themePalettes";

/** Load saved theme colours from the database (always fresh — not statically cached). */
export async function getSavedThemeCssVars(): Promise<Record<string, string>> {
  const theme = await getSavedTheme();
  return theme.cssVars;
}

export async function getSavedTheme(): Promise<{
  cssVars: Record<string, string>;
  surface?: "dark";
}> {
  noStore();
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: { id: "default" },
    });
    const primary = settings?.primaryColor ?? DEFAULT_PRIMARY;
    const secondary = settings?.secondaryColor ?? DEFAULT_SECONDARY;
    const palette = findThemePalette(primary, secondary);
    return {
      cssVars: themeColorsToCssVars(primary, secondary),
      surface: isDarkPageGradient(palette?.pageGradient) ? "dark" : undefined,
    };
  } catch {
    return { cssVars: themeColorsToCssVars(DEFAULT_PRIMARY, DEFAULT_SECONDARY) };
  }
}
