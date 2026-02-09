"use client";

import { useEffect } from "react";

export default function ColorThemeProvider() {
  useEffect(() => {
    document.documentElement.style.setProperty("--navy", "#1e3a5f");
    document.documentElement.style.setProperty("--navy-light", "#2c5282");
  }, []);

  return null;
}
