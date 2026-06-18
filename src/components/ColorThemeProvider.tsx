"use client";

import { useEffect } from "react";
import {
  applyThemeColors,
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  THEME_UPDATE_EVENT,
  persistThemeColors,
  readPersistedTheme,
} from "@/lib/themePalettes";

export default function ColorThemeProvider() {
  useEffect(() => {
    const persisted = readPersistedTheme();
    if (persisted) {
      applyThemeColors(persisted.primary, persisted.secondary);
    }

    const applyFromSettings = () => {
      fetch("/api/settings", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          const primary = data.primaryColor || DEFAULT_PRIMARY;
          const secondary = data.secondaryColor || DEFAULT_SECONDARY;
          applyThemeColors(primary, secondary);
          persistThemeColors(primary, secondary);
        })
        .catch(() => {});
    };

    const onThemeUpdate = (e: Event) => {
      const { primary, secondary } = (e as CustomEvent<{ primary: string; secondary: string }>).detail;
      if (primary && secondary) {
        applyThemeColors(primary, secondary);
        persistThemeColors(primary, secondary);
      }
    };

    window.addEventListener(THEME_UPDATE_EVENT, onThemeUpdate);
    window.addEventListener("focus", applyFromSettings);
    return () => {
      window.removeEventListener(THEME_UPDATE_EVENT, onThemeUpdate);
      window.removeEventListener("focus", applyFromSettings);
    };
  }, []);

  return null;
}
