/**
 * extractColor.ts
 * Reads a prepared image buffer, extracts the dominant color + secondary
 * tones using node-vibrant, and builds light/dark variants for the "wall
 * color" the user photographed.
 *
 * Requires: node-vibrant
 *   npm install node-vibrant
 */

import { Vibrant } from "node-vibrant/node";
import type { Color, ColorWithVariants } from "../../types/color";
import { rgbToColor, withVariants, softenForInterior } from "./colorUtils";

export interface ExtractedPalette {
  /** The single most dominant color — used as the "wall color" seed. */
  dominant: Color;
  /** Secondary tones pulled from the image (muted, vibrant, dark muted, etc). */
  secondary: Color[];
  /** Dominant color reshaped into light/dark variants for wall paint swatches. */
  wallColor: ColorWithVariants;
}

/**
 * Extracts the dominant + secondary colors from a prepared image buffer.
 * `buffer` should already be resized/validated (see imageUtils.ts).
 */
export async function extractColor(buffer: Buffer): Promise<ExtractedPalette> {
  const palette = await Vibrant.from(buffer).getPalette();

  // Vibrant's swatches, in priority order for "what color is this wall".
  const candidates = [
    palette.Muted,
    palette.DarkMuted,
    palette.LightMuted,
    palette.Vibrant,
    palette.DarkVibrant,
    palette.LightVibrant,
  ].filter((s): s is NonNullable<typeof s> => Boolean(s));

  if (candidates.length === 0) {
    throw new Error("Could not extract any colors from this image.");
  }

  // Muted swatches read as "wall paint" far more often than Vibrant ones,
  // which tend to pick up furniture, art, or accent objects instead.
  const dominantSwatch = palette.Muted ?? palette.DarkMuted ?? candidates[0];
  const dominantHex = softenForInterior(dominantSwatch.hex).hex;

  const secondary = candidates
    .filter((s) => s.hex.toUpperCase() !== dominantSwatch.hex.toUpperCase())
    .map((s) => rgbToColor({ r: s.rgb[0], g: s.rgb[1], b: s.rgb[2] }));

  const variants = withVariants(dominantHex);

  return {
    dominant: variants.base,
    secondary,
    wallColor: variants,
  };
}

/**
 * Extracts color directly from a File/Blob upload (convenience wrapper that
 * chains imageUtils -> extractColor). Import processUpload lazily to avoid
 * a circular import at module-eval time.
 */
export async function extractColorFromUpload(file: File): Promise<ExtractedPalette> {
  const { processUpload } = await import("./imageUtils");
  const buffer = await processUpload(file);
  return extractColor(buffer);
}
