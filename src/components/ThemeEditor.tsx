"use client";

import {
  THEME_PALETTES_CLASSIC,
  THEME_PALETTES_COMBO,
  THEME_PALETTES_GRADIENT,
  isPaletteSelected,
  paletteSwatchStyle,
  type ThemePalette,
} from "@/lib/themePalettes";
import { publishThemeUpdate } from "@/lib/themeClient";

type ThemeEditorProps = {
  primary: string;
  secondary: string;
  onChange: (primary: string, secondary: string) => void;
};

function PaletteGrid({
  palettes,
  primary,
  secondary,
  onSelect,
}: {
  palettes: ThemePalette[];
  primary: string;
  secondary: string;
  onSelect: (palette: ThemePalette) => void;
}) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 sm:gap-3">
      {palettes.map((palette) => {
        const selected = isPaletteSelected(palette, primary, secondary);
        const isGradient = Boolean(palette.pageGradient);
        return (
          <button
            key={palette.id}
            type="button"
            onClick={() => onSelect(palette)}
            title={palette.name}
            aria-label={palette.name}
            aria-pressed={selected}
            className={`group flex flex-col items-center gap-1.5 rounded-xl p-2 border transition touch-manipulation ${
              selected ? "border-charcoal/30 bg-white shadow-sm" : "border-transparent hover:bg-white/80"
            }`}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-black/10 ${
                isGradient ? "shadow-sm" : ""
              }`}
              style={paletteSwatchStyle(palette)}
            >
              {selected && (
                <svg
                  className={`w-5 h-5 drop-shadow ${isGradient ? "text-charcoal" : "text-white"}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </span>
            <span className="text-[11px] text-charcoal/70 text-center leading-tight">{palette.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function ThemeEditor({ primary, secondary, onChange }: ThemeEditorProps) {
  const selectPalette = (palette: ThemePalette) => {
    onChange(palette.primary, palette.secondary);
    publishThemeUpdate(palette.primary, palette.secondary);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-charcoal/60">
        Tap a theme to preview it live. Press <span className="font-medium text-charcoal">Save</span> at the top when you are happy.
      </p>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal/45 mb-2">Classic</p>
        <PaletteGrid palettes={THEME_PALETTES_CLASSIC} primary={primary} secondary={secondary} onSelect={selectPalette} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal/45 mb-2">Combinations</p>
        <PaletteGrid palettes={THEME_PALETTES_COMBO} primary={primary} secondary={secondary} onSelect={selectPalette} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal/45 mb-2">Gradients</p>
        <PaletteGrid palettes={THEME_PALETTES_GRADIENT} primary={primary} secondary={secondary} onSelect={selectPalette} />
      </div>
    </div>
  );
}
