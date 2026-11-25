import type { CSSProperties } from "react";

export const palettes = [
  { key: "template", label: "Colori del template", colors: null },
  { key: "oliva", label: "Oliva", colors: ["#f4f2e7", "#1e2d23", "#dde5cc", "#aebfa7", "#304b36"] },
  { key: "oceano", label: "Oceano", colors: ["#eff6fa", "#172e48", "#dceaf6", "#b0c7db", "#214b73"] },
  { key: "terracotta", label: "Terracotta", colors: ["#fbf1e7", "#39251c", "#f1daca", "#d5b6a4", "#803c2d"] },
] as const;

export type PaletteKey = typeof palettes[number]["key"];
export const appearanceSections = [
  { key: "show_about", label: "Chi siamo" },
  { key: "show_gallery", label: "Galleria fotografica" },
  { key: "show_opening_hours", label: "Orari di apertura" },
] as const;
export type SectionKey = typeof appearanceSections[number]["key"];
export type SiteAppearance = Record<SectionKey, boolean> & { color_palette: PaletteKey };

export const defaultAppearance: SiteAppearance = {
  color_palette: "template",
  show_about: true,
  show_gallery: true,
  show_opening_hours: true,
};

export function isPaletteKey(value: unknown): value is PaletteKey {
  return palettes.some((palette) => palette.key === value);
}

export function paletteStyle(key: PaletteKey): CSSProperties | undefined {
  const colors = palettes.find((palette) => palette.key === key)?.colors;
  if (!colors) return undefined;
  const [paper, ink, panel, line, accent] = colors;
  return {
    "--paper": paper,
    "--ink": ink,
    "--panel": panel,
    "--line": line,
    "--accent": accent,
    "--button-ink": "#fff",
  } as CSSProperties;
}
