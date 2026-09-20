/**
 * generatePalette.ts
 * Pure logic — no image processing. Takes a base ("wall") color and produces
 * accent options using standard color-harmony rules (complementary, analogous,
 * triadic, split-complementary), plus neutral interior-design pairings.
 * Also assembles the final palette once the user picks an accent.
 */

import type { AccentOption, Color, HarmonyType, Palette } from "../../types/color";
import {
  hexToHsl,
  hslToHex,
  toColor,
  withVariants,
  softenForInterior,
  clamp,
} from "./colorUtils";

/* ------------------------------------------------------------------ */
/* Harmony generators                                                   */
/* ------------------------------------------------------------------ */

function fromHueOffset(hex: string, offsetDegrees: number): Color {
  const hsl = hexToHsl(hex);
  let h = (hsl.h + offsetDegrees) % 360;
  if (h < 0) h += 360;
  return softenForInterior(hslToHex({ ...hsl, h }));
}

export function complementary(hex: string): Color {
  return fromHueOffset(hex, 180);
}

export function analogous(hex: string): [Color, Color] {
  return [fromHueOffset(hex, 30), fromHueOffset(hex, -30)];
}

export function triadic(hex: string): [Color, Color] {
  return [fromHueOffset(hex, 120), fromHueOffset(hex, 240)];
}

export function splitComplementary(hex: string): [Color, Color] {
  return [fromHueOffset(hex, 150), fromHueOffset(hex, 210)];
}

/**
 * Neutral interior-design pairings: warm/cool grays and off-whites that
 * pair with almost any wall color, sharing its hue but pulled to a very
 * low-saturation, mid-to-high lightness "trim/ceiling" tone.
 */
export function neutralPairing(hex: string): Color {
  const hsl = hexToHsl(hex);
  const s = clamp(hsl.s * 0.15, 0, 12);
  const l = clamp(hsl.l > 50 ? 88 : 82, 70, 92);
  return toColor(hslToHex({ h: hsl.h, s, l }));
}

/* ------------------------------------------------------------------ */
/* Option builder                                                       */
/* ------------------------------------------------------------------ */

/**
 * Builds 6-12 accent candidates across every harmony type, labeled for
 * display in a picker UI. This is what powers `complementaryOptions` in
 * the API response, despite the name — it's a harmony set, not just
 * strict complements.
 */
export function generateAccentOptions(wallHex: string): AccentOption[] {
  const [an1, an2] = analogous(wallHex);
  const [tr1, tr2] = triadic(wallHex);
  const [sc1, sc2] = splitComplementary(wallHex);

  const options: Omit<AccentOption, "id">[] = [
    { label: "Complementary", color: complementary(wallHex) },
    { label: "Analogous \u2014 Warm", color: an1 },
    { label: "Analogous \u2014 Cool", color: an2 },
    { label: "Triadic 1", color: tr1 },
    { label: "Triadic 2", color: tr2 },
    { label: "Split-Complementary 1", color: sc1 },
    { label: "Split-Complementary 2", color: sc2 },
    { label: "Neutral Pairing", color: neutralPairing(wallHex) },
  ];

  // De-duplicate near-identical hexes (can happen on very desaturated inputs)
  const seen = new Set<string>();
  const deduped = options.filter((opt) => {
    if (seen.has(opt.color.hex)) return false;
    seen.add(opt.color.hex);
    return true;
  });

  return deduped
    .slice(0, 12)
    .map((opt, i) => ({ id: `accent-${i + 1}`, ...opt }));
}

/**
 * Convenience: get accents for a single specific harmony type instead of
 * the full spread (useful if the UI offers a harmony-type filter).
 */
export function generateAccentsByType(wallHex: string, type: HarmonyType): Color[] {
  switch (type) {
    case "complementary":
      return [complementary(wallHex)];
    case "analogous":
      return analogous(wallHex);
    case "triadic":
      return triadic(wallHex);
    case "split-complementary":
      return splitComplementary(wallHex);
    case "neutral":
      return [neutralPairing(wallHex)];
    default:
      return [];
  }
}

/* ------------------------------------------------------------------ */
/* Final palette assembly                                               */
/* ------------------------------------------------------------------ */

/**
 * Builds the final palette after the user selects a wall color and an
 * accent option. Produces light/dark variants for both.
 */
export function buildFinalPalette(wallHex: string, accentHex: string): Palette {
  const wall = withVariants(wallHex);
  const accent = withVariants(accentHex, 20, 20);

  return {
    wallBase: wall.base,
    wallLight: wall.light,
    wallDark: wall.dark,
    accentBase: accent.base,
    accentLight: accent.light,
    accentDark: accent.dark,
  };
}
