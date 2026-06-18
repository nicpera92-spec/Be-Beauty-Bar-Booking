"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  THEME_PALETTES,
  findThemePalette,
  paletteSwatchStyle,
  type ThemePalette,
} from "@/lib/themePalettes";
import {
  companionSecondary,
  getHexLightness,
  normalizeHex,
  setHexLightness,
} from "@/lib/themeColorUtils";
import { publishThemeUpdate } from "@/lib/themeClient";

type ThemeEditorProps = {
  initialPrimary?: string | null;
  initialSecondary?: string | null;
  onSave: (primary: string, secondary: string) => Promise<boolean>;
  saving?: boolean;
  saveMessage?: { ok: boolean; message: string } | null;
};

function ColorControl({
  label,
  color,
  lightness,
  onColorChange,
  onLightnessChange,
}: {
  label: string;
  color: string;
  lightness: number;
  onColorChange: (hex: string) => void;
  onLightnessChange: (lightness: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-charcoal">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative shrink-0 cursor-pointer">
          <span
            className="block h-11 w-11 rounded-xl ring-1 ring-black/10 shadow-sm"
            style={{ backgroundColor: color }}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} colour picker`}
          />
        </label>
        <div className="flex-1 min-w-[160px] space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Lightness</span>
            <span>{lightness}%</span>
          </div>
          <input
            type="range"
            min={12}
            max={88}
            value={lightness}
            onChange={(e) => onLightnessChange(Number(e.target.value))}
            className="w-full accent-navy"
            aria-label={`${label} lightness`}
          />
        </div>
        <input
          type="text"
          value={color}
          onChange={(e) => {
            const next = normalizeHex(e.target.value);
            if (next) onColorChange(next);
          }}
          onBlur={(e) => {
            const next = normalizeHex(e.target.value);
            if (next) onColorChange(next);
          }}
          className="w-28 px-2.5 py-2 rounded-lg border border-slate-200 text-sm font-mono bg-white"
          aria-label={`${label} hex`}
        />
      </div>
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
  const [twoColours, setTwoColours] = useState(true);
  const [primary, setPrimary] = useState(initialPrimary ?? DEFAULT_PRIMARY);
  const [secondary, setSecondary] = useState(initialSecondary ?? DEFAULT_SECONDARY);
  const [primaryLightness, setPrimaryLightness] = useState(() =>
    getHexLightness(initialPrimary ?? DEFAULT_PRIMARY)
  );
  const [secondaryLightness, setSecondaryLightness] = useState(() =>
    getHexLightness(initialSecondary ?? DEFAULT_SECONDARY)
  );

  useEffect(() => {
    if (initialPrimary) {
      setPrimary(initialPrimary);
      setPrimaryLightness(getHexLightness(initialPrimary));
    }
    if (initialSecondary) {
      setSecondary(initialSecondary);
      setSecondaryLightness(getHexLightness(initialSecondary));
    }
  }, [initialPrimary, initialSecondary]);

  const effectiveSecondary = twoColours ? secondary : companionSecondary(primary);

  useEffect(() => {
    publishThemeUpdate(primary, effectiveSecondary);
  }, [primary, effectiveSecondary]);

  const activePalette = findThemePalette(primary, effectiveSecondary);

  const previewStyle = useMemo(() => {
    if (activePalette?.pageGradient) {
      return { background: activePalette.pageGradient };
    }
    return {
      background: `linear-gradient(90deg, ${primary} 0%, ${effectiveSecondary} 100%)`,
    };
  }, [activePalette, primary, effectiveSecondary]);

  const loadPreset = (palette: ThemePalette) => {
    setPrimary(palette.primary);
    setSecondary(palette.secondary);
    setPrimaryLightness(getHexLightness(palette.primary));
    setSecondaryLightness(getHexLightness(palette.secondary));
    setTwoColours(palette.primary.toLowerCase() !== palette.secondary.toLowerCase());
  };

  const updatePrimary = (hex: string) => {
    setPrimary(hex);
    setPrimaryLightness(getHexLightness(hex));
    if (!twoColours) {
      const nextSecondary = companionSecondary(hex);
      setSecondary(nextSecondary);
      setSecondaryLightness(getHexLightness(nextSecondary));
    }
  };

  const updateSecondary = (hex: string) => {
    setSecondary(hex);
    setSecondaryLightness(getHexLightness(hex));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(primary, effectiveSecondary);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <p className="text-sm text-slate-500">
        Make it yours. Choose one or two brand colours — full spectrum and lightness control.
        Gradient quick starters keep their soft page background until you customise the hex values.
      </p>

      <div className="flex items-center gap-3">
        <span className="text-sm text-charcoal">How many brand colours?</span>
        <div className="inline-flex rounded-full border border-slate-200 p-0.5 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setTwoColours(false);
              const next = companionSecondary(primary);
              setSecondary(next);
              setSecondaryLightness(getHexLightness(next));
            }}
            className={`px-3 py-1.5 rounded-full text-sm transition ${
              !twoColours ? "bg-navy text-white shadow-sm" : "text-charcoal/70 hover:text-charcoal"
            }`}
          >
            One colour
          </button>
          <button
            type="button"
            onClick={() => setTwoColours(true)}
            className={`px-3 py-1.5 rounded-full text-sm transition ${
              twoColours ? "bg-navy text-white shadow-sm" : "text-charcoal/70 hover:text-charcoal"
            }`}
          >
            Two colours
          </button>
        </div>
      </div>

      <div
        className="h-24 sm:h-28 rounded-2xl ring-1 ring-black/10 shadow-inner"
        style={previewStyle}
        aria-hidden
      />

      <div className={`grid gap-6 ${twoColours ? "sm:grid-cols-2" : ""}`}>
        <ColorControl
          label="Colour 1 — primary"
          color={primary}
          lightness={primaryLightness}
          onColorChange={updatePrimary}
          onLightnessChange={(l) => {
            setPrimaryLightness(l);
            updatePrimary(setHexLightness(primary, l));
          }}
        />
        {twoColours && (
          <ColorControl
            label="Colour 2 — secondary"
            color={secondary}
            lightness={secondaryLightness}
            onColorChange={updateSecondary}
            onLightnessChange={(l) => {
              setSecondaryLightness(l);
              updateSecondary(setHexLightness(secondary, l));
            }}
          />
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-3">
        <p className="text-sm font-medium text-charcoal">Quick starters</p>
        <p className="text-xs text-slate-500">Tap to load, then customise above.</p>
        <div className="flex flex-wrap gap-2">
          {THEME_PALETTES.map((palette) => {
            const selected =
              primary.toLowerCase() === palette.primary.toLowerCase() &&
              effectiveSecondary.toLowerCase() === palette.secondary.toLowerCase();
            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => loadPreset(palette)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition ${
                  selected
                    ? "border-slate-400 bg-slate-50 text-charcoal"
                    : "border-slate-200 bg-white text-charcoal/80 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="flex -space-x-1">
                  {palette.pageGradient ? (
                    <span
                      className="h-5 w-8 rounded-full ring-1 ring-black/10"
                      style={paletteSwatchStyle(palette)}
                    />
                  ) : (
                    <>
                      <span
                        className="h-4 w-4 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: palette.primary }}
                      />
                      <span
                        className="h-4 w-4 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: palette.secondary }}
                      />
                    </>
                  )}
                </span>
                {palette.name}
              </button>
            );
          })}
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
