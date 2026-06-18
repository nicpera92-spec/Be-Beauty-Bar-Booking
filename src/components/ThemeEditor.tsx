"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  THEME_PALETTES_CLASSIC,
  THEME_PALETTES_COMBO,
  THEME_PALETTES_GRADIENT,
  isPaletteSelected,
  paletteSwatchStyle,
  type ThemePalette,
} from "@/lib/themePalettes";
import { publishThemeUpdate } from "@/lib/themeClient";

type ThemeEditorProps = {
  initialPrimary?: string | null;
  initialSecondary?: string | null;
  onSave: (primary: string, secondary: string) => Promise<boolean>;
  saving?: boolean;
  saveMessage?: { ok: boolean; message: string } | null;
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
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
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
            className={`group flex flex-col items-center gap-1.5 rounded-xl p-2 border transition ${
              selected ? "border-slate-400 bg-slate-50" : "border-transparent hover:bg-slate-50"
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

export default function ThemeEditor({
  initialPrimary,
  initialSecondary,
  onSave,
  saving = false,
  saveMessage = null,
}: ThemeEditorProps) {
  const [primary, setPrimary] = useState(initialPrimary ?? DEFAULT_PRIMARY);
  const [secondary, setSecondary] = useState(initialSecondary ?? DEFAULT_SECONDARY);

  useEffect(() => {
    if (initialPrimary) setPrimary(initialPrimary);
    if (initialSecondary) setSecondary(initialSecondary);
  }, [initialPrimary, initialSecondary]);

  const selectPalette = (palette: ThemePalette) => {
    setPrimary(palette.primary);
    setSecondary(palette.secondary);
    publishThemeUpdate(palette.primary, palette.secondary);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(primary, secondary);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <p className="text-sm text-slate-500">
        Tap a theme to preview it live across booking and admin, then save. Gradient themes include a soft page background.
      </p>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Classic</p>
          <PaletteGrid
            palettes={THEME_PALETTES_CLASSIC}
            primary={primary}
            secondary={secondary}
            onSelect={selectPalette}
          />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Combinations</p>
          <PaletteGrid
            palettes={THEME_PALETTES_COMBO}
            primary={primary}
            secondary={secondary}
            onSelect={selectPalette}
          />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Gradients</p>
          <PaletteGrid
            palettes={THEME_PALETTES_GRADIENT}
            primary={primary}
            secondary={secondary}
            onSelect={selectPalette}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-navy text-white py-3 rounded-full font-medium hover:bg-navy-light disabled:opacity-50 transition"
      >
        {saving ? "Saving…" : "Save theme"}
      </button>
      {saveMessage && (
        <p className={`text-sm text-center ${saveMessage.ok ? "text-green-700" : "text-red-600"}`}>
          {saveMessage.message}
        </p>
      )}
    </form>
  );
}
