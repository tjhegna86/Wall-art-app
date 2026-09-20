/**
 * Shared types for the Color Engine.
 * Used across the engine (/lib/color-engine), the API route, and the frontend.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface Color {
  hex: string;
  rgb: RGB;
}

/** A color plus its light/dark tonal variants (used for wall + accent bases). */
export interface ColorWithVariants {
  base: Color;
  light: Color;
  dark: Color;
}

/** One candidate accent option returned to the user for selection. */
export interface AccentOption {
  id: string;
  label: string; // e.g. "Complementary", "Analogous 1", "Triadic 2"
  color: Color;
}

/** The final palette returned to the frontend after extraction + selection. */
export interface Palette {
  wallBase: Color;
  wallLight: Color;
  wallDark: Color;
  accentBase: Color;
  accentLight: Color;
  accentDark: Color;
}

/** Full response shape for POST /api/color-palette */
export interface ColorPaletteResponse {
  wallColor: ColorWithVariants;
  complementaryOptions: AccentOption[];
  finalPalette: Palette;
}

export type HarmonyType =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "neutral";
