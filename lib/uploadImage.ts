import { createClient } from "@/lib/supabase/browser";
import { compressImage, compressOriginal, cropImage } from "@/lib/imageCompression";
import { encodeWebp } from "@/lib/webp-actions";
import { croppedFileName, focusFileName, originalFileName, type CropRect, type FocalPoint } from "@/lib/storage-utils";
import {
  COMPRESSED_QUALITY,
  IMAGE_PRESETS,
  MAX_HERO_DIMENSION,
  MAX_UPLOAD_DIMENSION,
  minimumWidth,
  rateResolution,
  requiredLogoWidth,
  shouldSkipLossyEncode,
  type ImagePreset,
} from "@/lib/imageConstants";

/* Storing a photo in the media bucket, the way every uploader in the admin
   does it: components/ImageUploader.tsx for one photo at a time (with its
   crop and focal point steps), components/PhotoGallery.tsx for many at
   once. Browser only. */

export const BUCKET = "media";

// The bucket, through the signed-in admin's browser client.
export const storage = () => createClient().storage.from(BUCKET);

export function isSvgFile(file: File): boolean {
  return file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
}

// Some browsers (notably Chrome on non-Apple platforms, and iOS Safari in
// some cases) report an empty or generic file.type for HEIC/HEIF photos, so
// the extension check is required — file.type alone isn't reliable.
export function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

// heic2any touches browser-only globals at import time, so it's dynamically
// imported here rather than at module scope — this keeps it out of the SSR
// bundle entirely.
export async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  const newName = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}

/* The photo a file really holds, ready to upload, or null if a browser
   can't open it at all (it's damaged, or not a photo).

   Some tools save a photo as text: the image's bytes written out in base64,
   under a .jpg or .png name. No browser can draw that, so it's decoded back
   into the image it holds, named for what that turns out to be (often
   AVIF, whatever the name says). SVGs and HEICs pass straight through:
   they're checked where they're handled. */
const SIGNATURES: [type: string, ext: string, test: (b: Uint8Array) => boolean][] = [
  ["image/jpeg", "jpg", (b) => b[0] === 0xff && b[1] === 0xd8],
  ["image/png", "png", (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47],
  ["image/gif", "gif", (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46],
  ["image/webp", "webp", (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP"],
  ["image/avif", "avif", (b) => String.fromCharCode(...b.slice(4, 12)) === "ftypavif"],
];

export async function readablePhoto(file: File): Promise<File | null> {
  if (isSvgFile(file) || isHeicFile(file)) return file;
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!SIGNATURES.some(([, , test]) => test(head))) {
    const text = (await file.text()).replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
    if (/^[A-Za-z0-9+/]+=*$/.test(text)) {
      try {
        const binary = atob(text);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const found = SIGNATURES.find(([, , test]) => test(bytes));
        if (found) {
          const [type, ext] = found;
          file = new File([bytes], `${file.name.replace(/\.[^.]*$/, "")}.${ext}`, { type });
        }
      } catch {
        // Not base64 after all: left to the check below.
      }
    }
  }
  return (await readImageDimensions(file)) ? file : null;
}

export function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  });
}

// What a preset recommends, or what's passed in its place.
export function slotOf(preset: ImagePreset | undefined, recommendedWidth?: number | null, slotLabel?: string) {
  const config = preset ? IMAGE_PRESETS[preset] : null;
  const width = recommendedWidth !== undefined ? recommendedWidth : (config?.recommendedWidth ?? null);
  return {
    recommendedWidth: width,
    slotLabel: slotLabel ?? config?.slotLabel ?? null,
    // Only slots recommending at least the general cap count as heroes; the
    // smaller presets already sit well under it.
    isHero: width !== null && width >= MAX_UPLOAD_DIMENSION,
  };
}

/* Whether a photo will look blurry where it's shown: a warning to show, or
   null. Never blocks the upload. SVGs are vector and skipped. Raster logos
   have no fixed recommendedWidth (the width they render at depends on
   their shape), so they're checked against the site's logo box. */
export async function sizeWarning(
  file: File,
  crop: CropRect | null,
  preset: ImagePreset | undefined,
  recommendedWidth: number | null,
  slotLabel: string | null,
): Promise<string | null> {
  if (isSvgFile(file)) return null;
  const dims = crop ?? (await readImageDimensions(file));
  if (!dims) return null;
  if (preset === "logo") {
    const needed = requiredLogoWidth(dims.width, dims.height);
    return dims.width < needed
      ? `⚠ This logo is ${dims.width}px wide and will look blurry on the website. Upload an SVG version of the logo (best), or a PNG at least ${needed}px wide. You can still upload it.`
      : null;
  }
  if (recommendedWidth && rateResolution(dims.width, recommendedWidth) === "poor") {
    const forSlot = slotLabel ? ` for ${slotLabel}` : "";
    return `⚠ This image is ${dims.width}px wide and will look blurry on the website. Use one at least ${minimumWidth(recommendedWidth)}px wide${forSlot}. You can still upload it.`;
  }
  return null;
}

// A crop that couldn't be made: the upload stops, since the whole image isn't what was asked for.
export class CropFailedError extends Error {}

/* Encodes and stores `file` under `folder`, cropped to `crop` (null: the
   whole image, no stored original) or named with a focal point `focus`.
   Returns its storage path, public URL, and the file as stored. Throws if
   it can't be stored (CropFailedError if the crop failed).

   Encoding is skipped for SVGs. Slots that must not be lossily re-encoded
   (logos, email images) are only cropped, to PNG for logos and JPEG for
   email photos. Everything else gets the best-effort WebP pass: cap the
   longest side and re-encode, cropping in the same pass. Encoding never
   blocks an upload. A photo the browser couldn't make WebP (Safari can't)
   is made WebP on the server instead, from the photo as it came, cropped
   and capped the same way, its original kept the same way too
   (lib/webp-actions.ts); if that fails, it's stored as the browser encoded
   it. Every upload gets a new name, so files never overwrite each other. */
export async function storeImage({
  file,
  crop,
  focus,
  preset,
  folder,
  isHero,
}: {
  file: File;
  crop: CropRect | null;
  focus?: FocalPoint;
  preset: ImagePreset | undefined;
  folder?: string;
  isHero: boolean;
}): Promise<{ path: string; url: string; file: File }> {
  const prefix = folder ? `${folder.replace(/\/+$/, "")}/` : "";
  const maxDimension = isHero ? MAX_HERO_DIMENSION : MAX_UPLOAD_DIMENSION;
  let uploadFile = file;

  if (!isSvgFile(file)) {
    try {
      if (shouldSkipLossyEncode(preset)) {
        if (crop) {
          uploadFile = await cropImage(
            file,
            crop,
            preset === "logo" || file.type !== "image/jpeg" ? "image/png" : "image/jpeg",
          );
        }
      } else {
        uploadFile = await compressImage(file, maxDimension, COMPRESSED_QUALITY, crop ?? undefined);
      }
    } catch (error) {
      if (crop) throw new CropFailedError(error instanceof Error ? error.message : "Crop failed");
      console.error("Image compression failed, uploading original", error);
    }
  }

  // Cropped images carry their crop in the name (see storage-utils).
  const base = `${prefix}${Date.now()}-${Math.random().toString(36).substring(2)}`;
  const nameFor = (ext: string) =>
    crop ? croppedFileName(base, crop, ext) : focus ? focusFileName(base, focus, ext) : `${base}.${ext}`;

  let filePath = "";
  if (!isSvgFile(file) && !shouldSkipLossyEncode(preset) && uploadFile.type !== "image/webp") {
    const tmp = `tmp/${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const { error: tmpError } = await storage().upload(tmp, file, { contentType: file.type || undefined });
    if (
      !tmpError &&
      (await encodeWebp({
        source: tmp,
        target: nameFor("webp"),
        original: crop ? originalFileName(base) : null,
        crop,
        maxDimension,
        quality: COMPRESSED_QUALITY,
      }))
    )
      filePath = nameFor("webp");
  }

  if (!filePath) {
    filePath = nameFor(uploadFile.name.split(".").pop() ?? "img");
    // Keep the uncropped original so the image can be re-cropped later.
    // Best-effort: without it, a re-crop falls back to the cropped image.
    if (crop) {
      const original = await compressOriginal(file);
      const { error: originalError } = await storage().upload(originalFileName(base), original, {
        contentType: original.type,
      });
      if (originalError) console.error("Could not store original for re-cropping", originalError);
    }
    const { error: storageError } = await storage().upload(filePath, uploadFile);
    if (storageError) throw storageError;
  }

  const { data } = storage().getPublicUrl(filePath);
  return { path: filePath, url: data.publicUrl, file: uploadFile };
}
