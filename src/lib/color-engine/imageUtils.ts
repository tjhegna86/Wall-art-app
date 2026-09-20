/**
 * imageUtils.ts
 * Handles converting an uploaded file into a buffer, validating its type,
 * and resizing it before color extraction. Keeps I/O concerns out of
 * extractColor.ts.
 *
 * Requires: sharp
 *   npm install sharp
 */

import sharp from "sharp";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_DIMENSION = 800; // px — plenty for color extraction, keeps it fast
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB safety cap

export class InvalidImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidImageError";
  }
}

/**
 * Converts a File/Blob from a Next.js route handler's FormData into a Buffer.
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new InvalidImageError(
      `Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max is 15MB.`
    );
  }
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Validates that a buffer is actually a supported image type by reading
 * its real metadata (not just trusting the reported MIME type).
 */
export async function validateImage(buffer: Buffer): Promise<sharp.Metadata> {
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new InvalidImageError("File is not a readable image.");
  }

  if (!metadata.format || !ALLOWED_MIME_TYPES.has(`image/${metadata.format}`)) {
    throw new InvalidImageError(
      `Unsupported image format: ${metadata.format ?? "unknown"}. Use JPEG, PNG, WebP, or AVIF.`
    );
  }

  if (!metadata.width || !metadata.height) {
    throw new InvalidImageError("Could not read image dimensions.");
  }

  return metadata;
}

/**
 * Resizes an image down to a manageable size for fast, consistent color
 * extraction. Uses "inside" fit so aspect ratio is preserved and we never
 * upscale a small image.
 */
export async function prepareImageForExtraction(buffer: Buffer): Promise<Buffer> {
  await validateImage(buffer);

  return sharp(buffer)
    .rotate() // respect EXIF orientation
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#FFFFFF" }) // strip alpha so transparent PNGs extract cleanly
    .toFormat("png")
    .toBuffer();
}

/**
 * Convenience one-shot: raw upload -> ready-for-extraction buffer.
 */
export async function processUpload(file: File): Promise<Buffer> {
  const raw = await fileToBuffer(file);
  return prepareImageForExtraction(raw);
}
