"use client";

import { useEffect } from "react";
import { DEFAULT_PRIMARY, DEFAULT_SECONDARY } from "@/lib/themePalettes";

function applyTheme(primary: string, secondary: string) {
  const root = document.documentElement;
  root.style.setProperty("--navy", primary);
  root.style.setProperty("--navy-light", secondary);
}

export default function ColorThemeProvider() {
  useEffect(() => {
    applyTheme(DEFAULT_PRIMARY, DEFAULT_SECONDARY);
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        applyTheme(
          data.primaryColor || DEFAULT_PRIMARY,
          data.secondaryColor || DEFAULT_SECONDARY
        );
      })
      .catch(() => {});
  }, []);

  return null;
}
