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
  { id: "teal", name: "Teal", primary: "#134e5e", secondary: "#1f6f86" },
  { id: "ocean", name: "Ocean", primary: "#0c4a6e", secondary: "#0e7490" },
  { id: "burgundy", name: "Burgundy", primary: "#5e1f2d", secondary: "#842d40" },
  { id: "rust", name: "Rust", primary: "#8a3b1e", secondary: "#a85433" },
  { id: "copper", name: "Copper", primary: "#7a4520", secondary: "#9a5a2e" },
  { id: "slate", name: "Slate", primary: "#334155", secondary: "#475569" },
  { id: "charcoal", name: "Charcoal", primary: "#2b2b2b", secondary: "#444444" },
];

/** Bold colour combinations */
export const THEME_PALETTES_COMBO: ThemePalette[] = [
  { id: "red-cyan", name: "Red & cyan", primary: "#b91c1c", secondary: "#0891b2" },
  { id: "electric-blue", name: "Electric blue", primary: "#1d4ed8", secondary: "#38bdf8" },
  { id: "hot-pink", name: "Hot pink", primary: "#be185d", secondary: "#f472b6" },
  { id: "citrus", name: "Citrus", primary: "#ca8a04", secondary: "#84cc16" },
  { id: "mocha", name: "Mocha", primary: "#78350f", secondary: "#a8a29e" },
  { id: "sage-stone", name: "Sage & stone", primary: "#4d7c0f", secondary: "#78716c" },
  { id: "royal-gold", name: "Royal & gold", primary: "#312e81", secondary: "#d97706" },
  { id: "wine-blush", name: "Wine & blush", primary: "#881337", secondary: "#fda4af" },
];

/** Gradient page backgrounds with matching button accents */
export const THEME_PALETTES_GRADIENT: ThemePalette[] = [
  {
    id: "sunset",
    name: "Sunset",
    primary: "#fb7185",
    secondary: "#f9a8d4",
    pageGradient: "linear-gradient(145deg, #4a1528 0%, #6b1d3d 35%, #5b2148 68%, #3b1f5c 100%)",
  },
  {
    id: "aurora",
    name: "Aurora",
    primary: "#67e8f9",
    secondary: "#c4b5fd",
    pageGradient: "linear-gradient(145deg, #0c3d4a 0%, #1e3a5f 42%, #4c1d95 100%)",
  },
  {
    id: "neon-pulse",
    name: "Neon pulse",
    primary: "#fb7185",
    secondary: "#22d3ee",
    pageGradient: "linear-gradient(145deg, #5c1228 0%, #831843 32%, #0c4a6e 72%, #164e63 100%)",
  },
  {
    id: "peach-glow",
    name: "Peach glow",
    primary: "#fdba74",
    secondary: "#fda4af",
    pageGradient: "linear-gradient(145deg, #5c2a12 0%, #7c2d12 45%, #881337 100%)",
  },
  {
    id: "lavender-haze",
    name: "Lavender",
    primary: "#d8b4fe",
    secondary: "#e9d5ff",
    pageGradient: "linear-gradient(145deg, #3b0764 0%, #581c87 42%, #6b21a8 100%)",
  },
  {
    id: "cotton-candy",
    name: "Cotton candy",
    primary: "#f9a8d4",
    secondary: "#a5b4fc",
    pageGradient: "linear-gradient(145deg, #5c1838 0%, #831843 40%, #312e81 100%)",
  },
  {
    id: "ocean-breeze",
    name: "Sea breeze",
    primary: "#5eead4",
    secondary: "#7dd3fc",
    pageGradient: "linear-gradient(145deg, #0f3d38 0%, #115e59 45%, #0c4a6e 100%)",
  },
  {
    id: "golden-hour",
    name: "Golden hour",
    primary: "#fcd34d",
    secondary: "#fdba74",
    pageGradient: "linear-gradient(145deg, #5c3a0a 0%, #78350f 50%, #92400e 100%)",
  },
  {
    id: "berry-fusion",
    name: "Berry",
    primary: "#e879f9",
    secondary: "#c4b5fd",
    pageGradient: "linear-gradient(145deg, #581c5c 0%, #6b21a8 50%, #4c1d95 100%)",
  },
  {
    id: "mint-fresh",
    name: "Mint fresh",
    primary: "#6ee7b7",
    secondary: "#86efac",
    pageGradient: "linear-gradient(145deg, #0f3d24 0%, #14532d 50%, #065f46 100%)",
  },
  {
    id: "champagne-blush",
    name: "Champagne",
    primary: "#fcd34d",
    secondary: "#fbcfe8",
    pageGradient: "linear-gradient(145deg, #5c3a0a 0%, #78350f 35%, #831843 100%)",
  },
  {
    id: "lilac-mist",
    name: "Lilac mist",
    primary: "#c4b5fd",
    secondary: "#e9d5ff",
    pageGradient: "linear-gradient(145deg, #3b0764 0%, #5b21b6 50%, #6d28d9 100%)",
  },
];

export const THEME_PALETTES: ThemePalette[] = [
  ...THEME_PALETTES_CLASSIC,
  ...THEME_PALETTES_COMBO,
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

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = Math.max(0, Math.min(1, amount));
  return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
}

function extractHexColorsFromGradient(gradient: string): string[] {
  return gradient.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
}

function averageLuminanceFromGradient(gradient: string): number {
  const colors = extractHexColorsFromGradient(gradient);
  if (colors.length === 0) return 1;
  const total = colors.reduce((sum, hex) => {
    const { r, g, b } = hexToRgb(hex);
    return sum + luminance(r, g, b);
  }, 0);
  return total / colors.length;
}

function darkestColorInGradient(gradient: string): string {
  const colors = extractHexColorsFromGradient(gradient);
  if (colors.length === 0) return "#1e293b";
  return colors.reduce((darkest, hex) => {
    const { r, g, b } = hexToRgb(hex);
    const lum = luminance(r, g, b);
    const d = hexToRgb(darkest);
    return lum < luminance(d.r, d.g, d.b) ? hex : darkest;
  }, colors[0]);
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

function ensureContrastLight(textHex: string, bgHex: string, minRatio = 4.5): string {
  let text = textHex;
  const bg = hexToRgb(bgHex);
  const bgLum = luminance(bg.r, bg.g, bg.b);
  for (let i = 0; i < 16; i++) {
    const fg = hexToRgb(text);
    if (contrastRatio(luminance(fg.r, fg.g, fg.b), bgLum) >= minRatio) return text;
    text = lighten(text, 0.1);
  }
  return "#ffffff";
}

export function findThemePalette(primary: string, secondary: string): ThemePalette | undefined {
  const p = primary.toLowerCase();
  const s = secondary.toLowerCase();
  return THEME_PALETTES.find(
    (palette) => palette.primary.toLowerCase() === p && palette.secondary.toLowerCase() === s
  );
}

function contrastOnPrimary(primary: string): string {
  const { r, g, b } = hexToRgb(primary);
  return luminance(r, g, b) > 0.55 ? ensureContrast("#0f172a", primary) : "#ffffff";
}

export function isDarkPageGradient(pageGradient?: string): boolean {
  return Boolean(pageGradient && averageLuminanceFromGradient(pageGradient) < 0.22);
}

/** Build readable page background + text colours from the chosen accent palette. */
export function buildThemeTokens(
  primary: string,
  secondary: string,
  pageGradient?: string
): ThemeTokens {
  const isDarkGradient = isDarkPageGradient(pageGradient);

  if (isDarkGradient && pageGradient) {
    const pageBg = darkestColorInGradient(pageGradient);
    const text = ensureContrastLight("#f1f5f9", pageBg);
    const textMuted = ensureContrastLight(mixHex(text, secondary, 0.42), pageBg, 4.5);
    return {
      primary,
      secondary,
      pageBg,
      text,
      textMuted,
      onPrimary: contrastOnPrimary(primary),
      pageGradient,
    };
  }

  const pageBg = mixHex(primary, "#ffffff", pageGradient ? 0.14 : 0.1);
  const text = ensureContrast(primary, pageBg);
  const textMuted = ensureContrast(mixHex(text, "#64748b", 0.45), pageBg, 4.5);

  return {
    primary,
    secondary,
    pageBg,
    text,
    textMuted,
    onPrimary: contrastOnPrimary(primary),
    pageGradient,
  };
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
  const palette = findThemePalette(primary, secondary);
  const vars = themeColorsToCssVars(primary, secondary);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
  if (isDarkPageGradient(palette?.pageGradient)) {
    root.dataset.themeSurface = "dark";
  } else {
    delete root.dataset.themeSurface;
  }
}

/** Swatch background for the admin theme picker */
export function paletteSwatchStyle(
  palette: ThemePalette
): { background?: string; backgroundColor?: string } {
  if (palette.pageGradient) {
    return { background: palette.pageGradient };
  }
  return {
    background: `linear-gradient(135deg, ${palette.primary} 50%, ${palette.secondary} 50%)`,
  };
}

export function isPaletteSelected(
  palette: ThemePalette,
  primary: string,
  secondary: string
): boolean {
  return (
    palette.primary.toLowerCase() === primary.toLowerCase() &&
    palette.secondary.toLowerCase() === secondary.toLowerCase()
  );
}
