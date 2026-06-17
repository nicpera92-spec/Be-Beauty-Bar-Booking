"use client";

import { useEffect } from "react";
import { applyThemeColors, DEFAULT_PRIMARY, DEFAULT_SECONDARY } from "@/lib/themePalettes";

export default function ColorThemeProvider() {
  useEffect(() => {
    applyThemeColors(DEFAULT_PRIMARY, DEFAULT_SECONDARY);
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        applyThemeColors(
          data.primaryColor || DEFAULT_PRIMARY,
          data.secondaryColor || DEFAULT_SECONDARY
        );
      })
      .catch(() => {});
  }, []);

  return null;
}
