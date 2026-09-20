/**
 * index.ts
 * Barrel export for the Color Engine. Import everything the API route
 * (or any other server code) needs from one place:
 *
 *   import { extractColorFromUpload, generateAccentOptions, buildFinalPalette } from "@/lib/color-engine";
 */

export * from "./extractColor";
export * from "./generatePalette";
export * from "./colorUtils";
export * from "./imageUtils";
