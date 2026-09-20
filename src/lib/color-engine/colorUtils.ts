/**
 * colorUtils.ts
 * Pure color-math helpers: conversions, lighten/darken, saturation adjustments,
 * and "interior-design-friendly" tone shaping. No I/O, no image processing —
 * keeps extractColor.ts and generatePalette.ts clean.
 */

import type { RGB, HSL, Color } from "../../types/color";

/* ------------------------------------------------------------------ */
/* Conversions                                                         */
/* ------------------------------------------------------------------ */

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const num = parseInt(full, 16);
  if (Number.isNaN(num) || full.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;

  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rN) h = ((gN - bN) / delta) % 6;
    else if (max === gN) h = (bN - rN) / delta + 2;
    else h = (rN - gN) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sN = s / 100;
  const lN = l / 100;

  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = lN - c / 2;

  let [r1, g1, b1] = [0, 0, 0];
  if (hPrime >= 0 && hPrime < 1) [r1, g1, b1] = [c, x, 0];
  else if (hPrime < 2) [r1, g1, b1] = [x, c, 0];
  else if (hPrime < 3) [r1, g1, b1] = [0, c, x];
  else if (hPrime < 4) [r1, g1, b1] = [0, x, c];
  else if (hPrime < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
  };
}

export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex));
}

export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

export function toColor(hex: string): Color {
  return { hex: hex.toUpperCase(), rgb: hexToRgb(hex) };
}

export function rgbToColor(rgb: RGB): Color {
  return { hex: rgbToHex(rgb), rgb };
}

/* ------------------------------------------------------------------ */
/* Adjustments                                                         */
/* ------------------------------------------------------------------ */

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Lighten a hex color by `amount` percentage points of lightness (0-100). */
export function lighten(hex: string, amount: number): Color {
  const hsl = hexToHsl(hex);
  const next = { ...hsl, l: clamp(hsl.l + amount, 0, 100) };
  return toColor(hslToHex(next));
}

/** Darken a hex color by `amount` percentage points of lightness (0-100). */
export function darken(hex: string, amount: number): Color {
  return lighten(hex, -amount);
}

/** Increase or decrease saturation by `amount` percentage points (-100 to 100). */
export function adjustSaturation(hex: string, amount: number): Color {
  const hsl = hexToHsl(hex);
  const next = { ...hsl, s: clamp(hsl.s + amount, 0, 100) };
  return toColor(hslToHex(next));
}

/** Rotate hue by `degrees` (can be negative). */
export function rotateHue(hex: string, degrees: number): Color {
  const hsl = hexToHsl(hex);
  let h = (hsl.h + degrees) % 360;
  if (h < 0) h += 360;
  return toColor(hslToHex({ ...hsl, h }));
}

/**
 * Interior-design-friendly tone adjustment.
 * Wall paint reads harsh at full saturation/lightness extremes, so we pull
 * very saturated colors down and keep lightness in a livable band (12-92%).
 */
export function softenForInterior(hex: string): Color {
  const hsl = hexToHsl(hex);
  const s = clamp(hsl.s * 0.72, 0, 78); // avoid neon/oversaturated walls
  const l = clamp(hsl.l, 12, 92); // avoid near-black or near-white walls
  return toColor(hslToHex({ h: hsl.h, s, l }));
}

/** Generate a light + dark variant pair around a base color for swatches/UI states. */
export function withVariants(hex: string, lightAmount = 18, darkAmount = 18) {
  return {
    base: toColor(hex),
    light: lighten(hex, lightAmount),
    dark: darken(hex, darkAmount),
  };
}

/** Relative luminance (0-1), used for contrast checks (e.g. text-on-swatch). */
export function relativeLuminance({ r, g, b }: RGB): number {
  const transform = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [transform(r), transform(g), transform(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** WCAG contrast ratio between two colors (1-21). */
export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}
