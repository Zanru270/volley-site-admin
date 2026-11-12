// Browser-only image compression: cap the longest side and re-encode to WebP
// via <canvas>. DOM-dependent by design.
//
// A Node/sharp backfill for existing uploads shares the PARAMETERS in
// ./imageConstants but not this code — canvas has no Node equivalent here.

import {
  COMPRESSED_QUALITY,
  MAX_UPLOAD_DIMENSION,
  ORIGINAL_MAX_DIMENSION,
  ORIGINAL_QUALITY,
} from "./imageConstants";
import type { CropRect } from "./storage-utils";

function decodeViaImgElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode image"));
    };
    img.src = objectUrl;
  });
}

async function decodeImage(
  file: File,
): Promise<ImageBitmap | HTMLImageElement> {
  // `imageOrientation: "from-image"` bakes EXIF rotation into the decoded
  // pixels. This is the whole reason for preferring createImageBitmap here:
  // drawing an <img> to a canvas discards EXIF, so a portrait photo taken on a
  // phone would come out sideways. The <img> fallback below carries exactly
  // that risk and exists only for browsers without createImageBitmap.
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  }
  return await decodeViaImgElement(file);
}

type EncodeType = "image/webp" | "image/png" | "image/jpeg";

/** The browser can't encode `type` from a canvas (Safari and WebP). */
class EncodeUnsupportedError extends Error {}

const EXTENSIONS: Record<EncodeType, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/**
 * Draws `crop` (source pixels; whole image when omitted) of `file` onto a
 * canvas scaled so its longest side is at most `maxDimension`, then encodes it
 * as `type`. Never upscales. Throws on any failure.
 */
async function renderImage(
  file: File,
  {
    crop,
    maxDimension = Infinity,
    type,
    quality,
  }: {
    crop?: CropRect;
    maxDimension?: number;
    type: EncodeType;
    quality?: number;
  },
): Promise<File> {
  const source = await decodeImage(file);
  const sourceWidth =
    "naturalWidth" in source ? source.naturalWidth : source.width;
  const sourceHeight =
    "naturalHeight" in source ? source.naturalHeight : source.height;

  if (!sourceWidth || !sourceHeight) {
    if ("close" in source) source.close();
    throw new Error("Decoded image has no dimensions");
  }

  const area = crop ?? { x: 0, y: 0, width: sourceWidth, height: sourceHeight };

  // Scale down only — a source smaller than the cap keeps its original size.
  const scale = Math.min(1, maxDimension / Math.max(area.width, area.height));
  const targetWidth = Math.round(area.width * scale);
  const targetHeight = Math.round(area.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if ("close" in source) source.close();
    throw new Error("Could not get a 2D canvas context");
  }

  // Deliberately no fillRect before drawImage: the canvas starts fully
  // transparent and WebP/PNG carry an alpha channel, so a transparent PNG
  // stays transparent. Painting a white or black background here is exactly
  // the bug to avoid.
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );
  if ("close" in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });

  if (!blob) {
    throw new Error(`Canvas ${type} encode returned no blob`);
  }
  // Browsers that don't support an encode type (WebP, notably) silently
  // return PNG instead, which would produce a file whose extension lies.
  // Treat that as a failure so the caller can fall back.
  if (blob.type !== type) {
    throw new EncodeUnsupportedError(`Canvas encoded ${blob.type}, not ${type}`);
  }

  const baseName = file.name.replace(/\.[^./\\]+$/, "");
  return new File([blob], `${baseName}.${EXTENSIONS[type]}`, { type });
}

/**
 * Whether `file` has any see-through pixels, checked on a small copy (fine
 * detail can slip through, but a transparent background or cut-out can't).
 * Decides whether a browser that can't encode WebP must keep a PNG as PNG:
 * a photo saved as PNG without needing it can come out several times the
 * size of the file it came from.
 */
async function hasTransparency(file: File): Promise<boolean> {
  const source = await decodeImage(file);
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, 512 / Math.max(width, height, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if ("close" in source) source.close();
    return true; // Can't tell: keep it as PNG, the safe side.
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

// The image's longest side, in pixels.
async function longestSide(file: File): Promise<number> {
  const source = await decodeImage(file);
  const side =
    "naturalWidth" in source
      ? Math.max(source.naturalWidth, source.naturalHeight)
      : Math.max(source.width, source.height);
  if ("close" in source) source.close();
  return side;
}

// Formats every browser shows, which a file can be stored as it came.
const WEB_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Re-encodes `file` (or just its `crop` area) as WebP, scaled so its longest
 * side is at most `maxDimension`. Never upscales. Throws on any failure — the
 * caller decides whether to fall back to the original file.
 *
 * Safari can't encode WebP from a canvas (it returns a PNG). There the same
 * crop and size cap are encoded as JPEG instead — or PNG when the source is a
 * PNG with see-through parts — rather than failing: for a cropped upload
 * there is no original to fall back to, so a failure here stops the upload.
 *
 * Uncropped, a result bigger than the file it came from (already small
 * enough, in a format browsers show) is dropped for that file as it came:
 * re-encoding should never make an image heavier.
 */
export async function compressImage(
  file: File,
  maxDimension: number = MAX_UPLOAD_DIMENSION,
  quality: number = COMPRESSED_QUALITY,
  crop?: CropRect,
): Promise<File> {
  let result: File;
  try {
    result = await renderImage(file, {
      crop,
      maxDimension,
      type: "image/webp",
      quality,
    });
  } catch (error) {
    if (!(error instanceof EncodeUnsupportedError)) throw error;
    const keepPng = file.type === "image/png" && (await hasTransparency(file));
    result = await renderImage(file, {
      crop,
      maxDimension,
      type: keepPng ? "image/png" : "image/jpeg",
      quality,
    });
  }
  if (
    !crop &&
    result.size >= file.size &&
    WEB_TYPES.includes(file.type) &&
    (await longestSide(file)) <= maxDimension
  )
    return file;
  return result;
}

/**
 * Crops `file` at full resolution without the lossy WebP pass, for slots that
 * must skip it (see shouldSkipLossyEncode). Callers pick PNG for logos
 * (lossless) and JPEG for photos bound for email clients that can't decode WebP.
 */
export async function cropImage(
  file: File,
  crop: CropRect,
  type: "image/png" | "image/jpeg",
): Promise<File> {
  return renderImage(file, { crop, type, quality: 0.92 });
}

/**
 * The original kept beside a cropped upload, for re-cropping: the whole
 * image, scaled to ORIGINAL_MAX_DIMENSION and re-encoded at
 * ORIGINAL_QUALITY, so a huge phone photo doesn't fill the bucket. Falls back
 * to the file as it came if the browser can't encode it.
 */
export async function compressOriginal(file: File): Promise<File> {
  try {
    return await compressImage(file, ORIGINAL_MAX_DIMENSION, ORIGINAL_QUALITY);
  } catch (error) {
    console.error("Could not shrink the original, keeping it as it is", error);
    return file;
  }
}
