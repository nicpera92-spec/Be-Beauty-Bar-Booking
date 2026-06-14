// Curated theme palettes. Every primary colour is intentionally dark enough
// that white text on top stays readable, and dark enough to read as text on a
// white background — so contrast holds in every option.
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
];

export const DEFAULT_PRIMARY = THEME_PALETTES[0].primary;
export const DEFAULT_SECONDARY = THEME_PALETTES[0].secondary;
