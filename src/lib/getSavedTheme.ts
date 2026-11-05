import { unstable_noStore as noStore } from "next/cache";
import { getCachedPublicSettings } from "@/lib/cachedSettings";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  findThemePalette,
  isDarkPageGradient,
  themeColorsToCssVars,
} from "@/lib/themePalettes";

/** Load saved theme colours (pages render per request; the settings read itself is cached). */
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
    const settings = await getCachedPublicSettings();
    const primary = (settings?.primaryColor as string | null | undefined) ?? DEFAULT_PRIMARY;
    const secondary = (settings?.secondaryColor as string | null | undefined) ?? DEFAULT_SECONDARY;
    const palette = findThemePalette(primary, secondary);
    return {
      cssVars: themeColorsToCssVars(primary, secondary),
      surface: isDarkPageGradient(palette?.pageGradient) ? "dark" : undefined,
    };
  } catch {
    return { cssVars: themeColorsToCssVars(DEFAULT_PRIMARY, DEFAULT_SECONDARY) };
  }
}
