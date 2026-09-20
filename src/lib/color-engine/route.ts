/**
 * POST /api/color-palette
 *
 * The single MVP backend endpoint. Accepts an uploaded image, extracts the
 * dominant "wall color", generates accent options, and — if the caller
 * already picked an accent — returns the final assembled palette too.
 *
 * Request (multipart/form-data):
 *   image      : File            (required) — the uploaded photo
 *   accentHex  : string          (optional) — a previously chosen accent hex,
 *                                              e.g. from complementaryOptions
 *
 * Response 200 (application/json): ColorPaletteResponse
 * Response 400: { error: string }   — bad/missing image
 * Response 500: { error: string }   — extraction failure
 */

import { NextRequest, NextResponse } from "next/server";
import {
  processUpload,
  InvalidImageError,
  extractColor,
  generateAccentOptions,
  buildFinalPalette,
} from "../../../lib/color-engine";
import type { ColorPaletteResponse } from "../../../types/color";

export const runtime = "nodejs"; // sharp/node-vibrant need the Node runtime, not Edge

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const image = formData.get("image");
  if (!image || !(image instanceof File)) {
    return NextResponse.json({ error: "Missing required 'image' file." }, { status: 400 });
  }

  const accentHexField = formData.get("accentHex");
  const requestedAccentHex =
    typeof accentHexField === "string" && accentHexField.trim() ? accentHexField.trim() : null;

  try {
    const buffer = await processUpload(image);
    const extracted = await extractColor(buffer);

    const wallHex = extracted.wallColor.base.hex;
    const complementaryOptions = generateAccentOptions(wallHex);

    // Use the caller's chosen accent if provided, otherwise default to the
    // first (complementary) option so the response is always complete.
    const accentHex = requestedAccentHex ?? complementaryOptions[0].color.hex;
    const finalPalette = buildFinalPalette(wallHex, accentHex);

    const response: ColorPaletteResponse = {
      wallColor: extracted.wallColor,
      complementaryOptions,
      finalPalette,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    if (err instanceof InvalidImageError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[color-palette] extraction failed:", err);
    return NextResponse.json(
      { error: "Could not process this image. Try a clearer, well-lit photo." },
      { status: 500 }
    );
  }
}
