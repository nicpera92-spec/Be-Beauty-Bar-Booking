import {
  applyThemeColors,
  persistThemeColors,
  THEME_UPDATE_EVENT,
} from "@/lib/themePalettes";

/** Apply theme live across booking + admin (client only). */
export function publishThemeUpdate(primary: string, secondary: string) {
  applyThemeColors(primary, secondary);
  persistThemeColors(primary, secondary);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(THEME_UPDATE_EVENT, { detail: { primary, secondary } })
    );
  }
}
