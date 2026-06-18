// Curated theme palettes. Colours are expanded into page background + text tokens
// with contrast checks so copy stays readable on every option.

export type ThemePalette = {
  id: string;
  name: string;
  primary: string; // buttons, accents, links (dark)
  secondary: string; // hover / lighter shade
  /** Optional full-page gradient background */
  pageGradient?: string;
};

/** Classic solid accent themes */
export const THEME_PALETTES_CLASSIC: ThemePalette[] = [
  { id: "navy", name: "Navy", primary: "#1e3a5f", secondary: "#2c5282" },
  { id: "indigo", name: "Indigo", primary: "#2e2a6b", secondary: "#423c94" },
  { id: "violet", name: "Violet", primary: "#4a2670", secondary: "#66348f" },
  { id: "plum", name: "Plum", primary: "#5b2a4e", secondary: "#7d3a6b" },
  { id: "rose", name: "Rose", primary: "#8a2d52", secondary: "#a8385f" },
  { id: "emerald", name: "Emerald", primary: "#1f5141", secondary: "#2f7359" },
  { id: "ocean", name: "Ocean", primary: "#0c4a6e", secondary: "#0e7490" },
  { id: "charcoal", name: "Charcoal", primary: "#2b2b2b", secondary: "#444444" },
];

/** Gradient page backgrounds with matching button accents */
export const THEME_PALETTES_GRADIENT: ThemePalette[] = [
  {
    id: "sunset",
    name: "Sunset",
    primary: "#9d174d",
    secondary: "#db2777",
    pageGradient: "linear-gradient(145deg, #fff1f2 0%, #ffe4e6 38%, #fce7f3 72%, #ede9fe 100%)",
  },
  {
    id: "aurora",
    name: "Aurora",
    primary: "#5b21b6",
    secondary: "#0891b2",
    pageGradient: "linear-gradient(145deg, #ecfeff 0%, #e0e7ff 48%, #f3e8ff 100%)",
  },
  {
    id: "peach-glow",
    name: "Peach glow",
    primary: "#c2410c",
    secondary: "#e11d48",
    pageGradient: "linear-gradient(145deg, #fff7ed 0%, #ffedd5 45%, #fecdd3 100%)",
  },
  {
    id: "lavender-haze",
    name: "Lavender",
    primary: "#6b21a8",
    secondary: "#9333ea",
    pageGradient: "linear-gradient(145deg, #faf5ff 0%, #f3e8ff 42%, #e9d5ff 100%)",
  },
  {
    id: "ocean-breeze",
    name: "Sea breeze",
    primary: "#0f766e",
    secondary: "#0284c7",
    pageGradient: "linear-gradient(145deg, #f0fdfa 0%, #ccfbf1 45%, #e0f2fe 100%)",
  },
  {
    id: "golden-hour",
    name: "Golden hour",
    primary: "#b45309",
    secondary: "#d97706",
    pageGradient: "linear-gradient(145deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)",
  },
  {
    id: "berry-fusion",
    name: "Berry",
    primary: "#86198f",
    secondary: "#7c3aed",
    pageGradient: "linear-gradient(145deg, #fdf2f8 0%, #fae8ff 50%, #ede9fe 100%)",
  },
  {
    id: "mint-fresh",
    name: "Mint fresh",
    primary: "#166534",
    secondary: "#059669",
    pageGradient: "linear-gradient(145deg, #f0fdf4 0%, #dcfce7 50%, #ecfdf5 100%)",
  },
];

export const THEME_PALETTES: ThemePalette[] = [
  ...THEME_PALETTES_CLASSIC,
  ...THEME_PALETTES_GRADIENT,
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
  pageGradient?: string;
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

export function findThemePalette(primary: string, secondary: string): ThemePalette | undefined {
  const p = primary.toLowerCase();
  const s = secondary.toLowerCase();
  return THEME_PALETTES.find(
    (palette) => palette.primary.toLowerCase() === p && palette.secondary.toLowerCase() === s
  );
}

/** Build readable page background + text colours from the chosen accent palette. */
export function buildThemeTokens(
  primary: string,
  secondary: string,
  pageGradient?: string
): ThemeTokens {
  const pageBg = mixHex(primary, "#ffffff", pageGradient ? 0.14 : 0.1);
  const text = ensureContrast(primary, pageBg);
  const textMuted = ensureContrast(mixHex(text, "#64748b", 0.45), pageBg, 4.5);

  return { primary, secondary, pageBg, text, textMuted, onPrimary: "#ffffff", pageGradient };
}

function rgbTriplet(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

/** CSS custom properties for a theme — used server-side (layout) and client-side. */
export function themeColorsToCssVars(primary: string, secondary: string): Record<string, string> {
  const palette = findThemePalette(primary, secondary);
  const tokens = buildThemeTokens(primary, secondary, palette?.pageGradient);
  const vars: Record<string, string> = {
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
    "--theme-page-gradient": palette?.pageGradient ?? "none",
  };
  return vars;
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

/** Swatch background for the admin theme picker */
export function paletteSwatchStyle(
  palette: ThemePalette
): { background?: string; backgroundColor?: string } {
  if (palette.pageGradient) {
    return { background: palette.pageGradient };
  }
  return { backgroundColor: palette.primary };
}
