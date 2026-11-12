export function getStoragePathFromUrl(
  url: string | null | undefined,
  bucketName: string,
): string | null {
  if (!url || !url.includes("supabase.co")) return null;

  // Matches the standard Supabase storage URL pattern structure
  const baseUrlMarker = `/storage/v1/object/public/${bucketName}/`;
  const markerIndex = url.indexOf(baseUrlMarker);

  if (markerIndex !== -1) {
    // Extracts everything AFTER the bucket name, preserving all folder paths
    return url.substring(markerIndex + baseUrlMarker.length);
  }

  return null;
}

export function detectBucketFromUrl(url: string): "images" | "videos" {
  return url.includes("/public/videos/") ? "videos" : "images";
}

// --- Cropped uploads ---------------------------------------------------------
//
// A cropped upload is stored as two objects in the bucket root (root, not a
// folder, because scripts/backup-bucket.mts doesn't recurse):
//
//   <base>__crop-<x>-<y>-<w>-<h>.<ext>   what the site shows (the URL saved in the DB)
//   <base>__original                     the uncropped source, for re-cropping
//
// The crop rectangle (source pixels) lives in the filename, so re-cropping
// needs nothing but the saved URL — no DB columns or sidecar files. A cropped
// image can carry a focal point too, after the crop:
// <base>__crop-<x>-<y>-<w>-<h>__focus-<x>-<y>.<ext> (see Focal points below).
// It keeps the same <base>__original. Every crop,
// including a re-crop, gets its own <base> and its own copy of the original, so
// deleting one image can never strand another's original.

export type CropRect = { x: number; y: number; width: number; height: number };

const CROPPED_NAME =
  /^(.*)__crop-(\d+)-(\d+)-(\d+)-(\d+)(?:__focus-\d{1,3}-\d{1,3})?\.[^./]+$/;

export function croppedFileName(
  base: string,
  crop: CropRect,
  ext: string,
  focus?: FocalPoint,
) {
  const { x, y, width, height } = crop;
  const focusPart = focus
    ? `__focus-${Math.round(focus.x)}-${Math.round(focus.y)}`
    : "";
  return `${base}__crop-${x}-${y}-${width}-${height}${focusPart}.${ext}`;
}

export function originalFileName(base: string) {
  return `${base}__original`;
}

/** Parses a cropped image's storage path; null for uploads made before cropping existed. */
export function parseCroppedPath(
  path: string,
): { originalPath: string; crop: CropRect } | null {
  const match = CROPPED_NAME.exec(path);
  if (!match) return null;
  const [, base, x, y, width, height] = match;
  return {
    originalPath: originalFileName(base),
    crop: { x: +x, y: +y, width: +width, height: +height },
  };
}

/** Adds each cropped image's stored original, so deleting an image deletes both. */
export function withCropCompanions(paths: string[]): string[] {
  const companions = paths.flatMap((path) => {
    const parsed = parseCroppedPath(path);
    return parsed ? [parsed.originalPath] : [];
  });
  return [...paths, ...companions];
}

// --- Focal points ------------------------------------------------------------
//
// Slots the site shows at several shapes (full-screen heroes, cards, carousels)
// can't use one fixed crop, so they store a focal point: the spot, as
// percentages of width and height, that must stay in view however the site's
// object-cover trims the image. Any other image may have one too, set after
// its crop (for the screens that show only part of the crop). Like a crop it
// lives in the filename — <base>__focus-<x>-<y>.<ext>, or after the crop part
// of a cropped name — and the site turns it into object-position (BOW-and-ARC
// lib/imageFocus.ts reads it from the end of the name; keep them in sync).

export type FocalPoint = { x: number; y: number };

const FOCUS_NAME = /__focus-(\d{1,3})-(\d{1,3})\.[^./]+$/;

export function focusFileName(base: string, focus: FocalPoint, ext: string) {
  return `${base}__focus-${Math.round(focus.x)}-${Math.round(focus.y)}.${ext}`;
}

export function parseFocusPath(path: string): FocalPoint | null {
  const match = FOCUS_NAME.exec(path);
  return match ? { x: +match[1], y: +match[2] } : null;
}
