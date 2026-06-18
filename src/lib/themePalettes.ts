// Curated theme palettes. Colours are expanded into page background + text tokens
// with contrast checks so copy stays readable on every option.

export type ThemePalette = {
  id: string;
  name: string;
  primary: string; // buttons, accents, links (dark)
  secondary: string; // hover / lighter shade
};

export const THEME_PALETTES: ThemePalette[] = [
  { id: "navy", name: "Navy", primary: "#1e3a5f", secondary: "#2c5282" },
  { id: "teal", name: "Teal", primary: "#134e5e", secondary: "#1f6f86" },
  { id: "emerald", name: "Emerald", primary: "#1f5141", secondary: "#2f7359" },
  { id: "forest", name: "Forest", primary: "#2d4a2b", secondary: "#3f6b3c" },
  { id: "plum", name: "Plum", primary: "#5b2a4e", secondary: "#7d3a6b" },
  { id: "burgundy", name: "Burgundy", primary: "#5e1f2d", secondary: "#842d40" },
  { id: "espresso", name: "Espresso", primary: "#4a3528", secondary: "#6b4d3a" },
  { id: "charcoal", name: "Charcoal", primary: "#2b2b2b", secondary: "#444444" },
  { id: "indigo", name: "Indigo", primary: "#2e2a6b", secondary: "#423c94" },
  { id: "violet", name: "Violet", primary: "#4a2670", secondary: "#66348f" },
  { id: "slate", name: "Slate", primary: "#334155", secondary: "#475569" },
  { id: "rust", name: "Rust", primary: "#8a3b1e", secondary: "#a85433" },
  { id: "ochre", name: "Ochre", primary: "#6f5511", secondary: "#8a6c1f" },
  { id: "rose", name: "Rose", primary: "#8a2d52", secondary: "#a8385f" },
  { id: "ocean", name: "Ocean", primary: "#0c4a6e", secondary: "#0e7490" },
  { id: "copper", name: "Copper", primary: "#7a4520", secondary: "#9a5a2e" },
];

export const DEFAULT_PRIMARY = THEME_PALETTES[0].primary;
export const DEFAULT_SECONDARY = THEME_PALETTES[0].secondary;

export type ThemeTokens = {
  primary: string;
  secondary: string;
  pageBg: string;
  text: string;
  textMuted: string;
  onPrimary: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

function luminance(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function mixHex(a: string, b: string, weightA: number): string {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  const w = Math.max(0, Math.min(1, weightA));
  return rgbToHex(
    c1.r * w + c2.r * (1 - w),
    c1.g * w + c2.g * (1 - w),
    c1.b * w + c2.b * (1 - w)
  );
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amount;
  return rgbToHex(r * f, g * f, b * f);
}

function ensureContrast(textHex: string, bgHex: string, minRatio = 4.5): string {
  let text = textHex;
  const bg = hexToRgb(bgHex);
  const bgLum = luminance(bg.r, bg.g, bg.b);
  for (let i = 0; i < 12; i++) {
    const fg = hexToRgb(text);
    if (contrastRatio(luminance(fg.r, fg.g, fg.b), bgLum) >= minRatio) return text;
    text = darken(text, 0.08);
  }
  return text;
}

/** Build readable page background + text colours from the chosen accent palette. */
export function buildThemeTokens(primary: string, secondary: string): ThemeTokens {
  const pageBg = mixHex(primary, "#ffffff", 0.1);
  const text = ensureContrast(primary, pageBg);
  const textMuted = ensureContrast(mixHex(text, "#64748b", 0.45), pageBg, 4.5);

  return { primary, secondary, pageBg, text, textMuted, onPrimary: "#ffffff" };
}

function rgbTriplet(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

/** CSS custom properties for a theme — used server-side (layout) and client-side. */
export function themeColorsToCssVars(primary: string, secondary: string): Record<string, string> {
  const tokens = buildThemeTokens(primary, secondary);
  return {
    "--navy": tokens.primary,
    "--navy-light": tokens.secondary,
    "--theme-bg": tokens.pageBg,
    "--theme-text": tokens.text,
    "--theme-text-muted": tokens.textMuted,
    "--theme-on-primary": tokens.onPrimary,
    "--navy-rgb": rgbTriplet(tokens.primary),
    "--theme-text-rgb": rgbTriplet(tokens.text),
    "--theme-text-muted-rgb": rgbTriplet(tokens.textMuted),
    "--theme-bg-rgb": rgbTriplet(tokens.pageBg),
  };
}

export const THEME_UPDATE_EVENT = "bb-theme-update";
const THEME_STORAGE_KEY = "bb-theme-colors";

/** Persist theme in sessionStorage so client navigations keep the saved palette. */
export function persistThemeColors(primary: string, secondary: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ primary, secondary }));
  } catch {
    /* ignore */
  }
}

export function readPersistedTheme(): { primary: string; secondary: string } | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { primary?: string; secondary?: string };
    if (parsed.primary && parsed.secondary) {
      return { primary: parsed.primary, secondary: parsed.secondary };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Apply theme tokens to the document root (booking + admin). */
export function applyThemeColors(primary: string, secondary: string) {
  if (typeof document === "undefined") return;
  const vars = themeColorsToCssVars(primary, secondary);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
}
