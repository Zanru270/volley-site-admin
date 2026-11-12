// Shared image sizing + quality parameters.
//
// Intentionally dependency-free: no "use client", no next/image, no DOM types,
// no sharp. The browser uploader (canvas encode) and any future Node backfill
// script (sharp encode) both import their parameters from here, so the two
// encoders stay in sync even though the encode engines differ.

// Recommended source width per display slot. Numbers assume the image may be
// shown on a 2x (retina) screen, i.e. ~2x the largest CSS width it renders at.
// Each is a slot on the Volley website (../volley-site); keep them in step.
export const IMAGE_PRESETS = {
  // Full-screen photos: the photo bands a section scrolls away to uncover
  // (StoriedNeighbourhoods: reveal, community, neighbourhood).
  hero: {
    recommendedWidth: 3840,
    slotLabel: "full-screen photos",
  },
  // A building's hero slideshow (LocationHero): 56vw wide on desktop.
  slide: {
    recommendedWidth: 2400,
    slotLabel: "slideshow photos",
  },
  // "Take a look around" (LookAround): 60vw wide on desktop.
  gallery: {
    recommendedWidth: 2560,
    slotLabel: "gallery photos",
  },
  // The aerial map: full width, shown whole.
  map: {
    recommendedWidth: 3200,
    slotLabel: "maps",
  },
  // A building's card in the Locations carousel: 400px wide.
  card: {
    recommendedWidth: 960,
    slotLabel: "card photos",
  },
  // "The res your dad wishes" photo: max-w-3xl, 672px.
  feature: {
    recommendedWidth: 1440,
    slotLabel: "photos",
  },
  // Room type floor plans: about half the page wide.
  floorplan: {
    recommendedWidth: 1600,
    slotLabel: "floor plans",
  },
  // Volley Reader: the article's photos and its card.
  article: {
    recommendedWidth: 2200,
    slotLabel: "article photos",
  },
  // Stickers and logos: no useful raster width; SVG is the right format.
  logo: {
    recommendedWidth: null,
    slotLabel: "sticker",
  },
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

// --- Slot shapes ---------------------------------------------------------------
//
// How the website frames each upload slot. Every ImageUploader gets one of
// these, so editors crop to exactly what visitors will see.

/** Slots the site always shows at one fixed shape (width / height). Not
    "Take a look around": it shows each photo in its own shape. */
export const SLOT_ASPECTS = {
  feature: 8 / 5, // DadSection: aspect-8/5
  map: 3509 / 2210, // LocationMap: aspect-3509/2210 (Baileys' map)
  articleHero: 757 / 673, // ArticleView's title photo: aspect-757/673
  articleImage: 3 / 2, // an article's photo block: aspect-3/2
  articleRowPhoto: 410 / 598, // a photo in an article's photo row: aspect-410/598
} as const;

export type FocalPreview = { readonly label: string; readonly aspect: number };

/** Live previews in the crop step, for cropped slots shown at other shapes too. */
export const CROP_PREVIEWS = {} as const satisfies Record<string, readonly FocalPreview[]>;

/**
 * Slots the site shows at several shapes; each gets a focal point instead of
 * a crop, previewed at these shapes (at most three).
 */
export const FOCAL_PREVIEWS = {
  // StoriedNeighbourhoods: a full screen from md, half a screen on a phone.
  screen: [
    { label: "Desktop", aspect: 16 / 9 },
    { label: "Phone", aspect: 9 / 10 },
  ],
  // LocationHero slides: 56vw × 35vw on desktop, 84vw × 62vw on a phone.
  slide: [
    { label: "Desktop", aspect: 56 / 35 },
    { label: "Phone", aspect: 84 / 62 },
  ],
  // A Volley Reader card: tall, short or medium by its place in the
  // carousel (cardAspect in the site's lib/articles.js), landscape on a phone.
  articleCard: [
    { label: "Tall card", aspect: 347 / 454 },
    { label: "Short card", aspect: 347 / 303 },
    { label: "Phone", aspect: 322 / 255 },
  ],
  // LocationsSection cards: 400 × 320 on desktop, about square on a phone.
  card: [
    { label: "Desktop", aspect: 5 / 4 },
    { label: "Phone", aspect: 1 },
  ],
} as const satisfies Record<string, readonly FocalPreview[]>;

// The sticker's box on the site (ParallaxReveal: w-32 md:w-60), so a raster
// sticker is checked against it. A logo has no single recommended width.
export const LOGO_SLOT = { maxWidth: 240, maxHeight: 240 } as const;

/**
 * Minimum pixel width a raster logo of the given dimensions needs to stay
 * crisp in LOGO_SLOT on a 2x (retina) screen.
 */
export function requiredLogoWidth(width: number, height: number): number {
  const renderedWidth = Math.min(LOGO_SLOT.maxWidth, LOGO_SLOT.maxHeight * (width / height));
  return Math.ceil(renderedWidth * 2);
}

// --- Resolution rating -------------------------------------------------------
//
// recommendedWidth (and requiredLogoWidth) are 2x the largest CSS width an
// image is shown at — ideal for retina screens. Photos hold up well below
// that: at 60% the upscale isn't visible on a retina screen, and down to 40%
// (a mild ~1.25x stretch on a large standard screen) they still look fine —
// checked by eye against the live site's galleries (e.g. 1425–1650px photos
// in an 85vw carousel). Below 40% the stretch shows. Logos keep stricter
// cut-offs: blur on lettering and hard edges shows far sooner than in a photo.
const RESOLUTION_THRESHOLDS = {
  photo: { good: 0.6, ok: 0.4 },
  logo: { good: 1, ok: 0.75 },
} as const;

export type ResolutionRating = "good" | "ok" | "poor";

export function rateResolution(
  width: number,
  recommendedWidth: number,
  isLogo = false,
): ResolutionRating {
  const thresholds = RESOLUTION_THRESHOLDS[isLogo ? "logo" : "photo"];
  const ratio = width / recommendedWidth;
  if (ratio >= thresholds.good) return "good";
  if (ratio >= thresholds.ok) return "ok";
  return "poor";
}

/** Narrowest width rated "good" (sharp on all screens). */
export function sharpWidth(recommendedWidth: number, isLogo = false): number {
  return Math.ceil(
    recommendedWidth * RESOLUTION_THRESHOLDS[isLogo ? "logo" : "photo"].good,
  );
}

/** Narrowest width that won't be rated "poor" (blurry). */
export function minimumWidth(recommendedWidth: number, isLogo = false): number {
  return Math.ceil(
    recommendedWidth * RESOLUTION_THRESHOLDS[isLogo ? "logo" : "photo"].ok,
  );
}

// Presets that must never be lossily re-encoded. Logos are brand marks: hard
// edges and flat colour pick up visible artifacts at any lossy WebP quality,
// and the files are small enough that the egress saving is negligible either
// way. This is format-independent — a PNG or JPEG logo is skipped for the same
// reason an SVG is, so the SVG check alone isn't sufficient.
export const LOSSLESS_PRESETS = ["logo"] as const;

export function isLosslessPreset(
  preset: ImagePreset | null | undefined,
): boolean {
  if (!preset) return false;
  return (LOSSLESS_PRESETS as readonly string[]).includes(preset);
}

/** Single entry point for "should this image skip the lossy WebP pass?". */
export function shouldSkipLossyEncode(preset: ImagePreset | null | undefined): boolean {
  return isLosslessPreset(preset);
}

const PRESET_WIDTHS: readonly (number | null)[] = Object.values(
  IMAGE_PRESETS,
).map((preset) => preset.recommendedWidth);

// Largest recommendedWidth across all presets, with null widths (logo) excluded.
// Derived rather than hardcoded so adding a larger preset raises the cap on its
// own. Currently resolves to 3840, via the `hero` preset.
export const MAX_UPLOAD_DIMENSION = Math.max(
  ...PRESET_WIDTHS.filter((width): width is number => width !== null),
);

// Hero slots get headroom above MAX_UPLOAD_DIMENSION. The general cap lands
// exactly on the hero preset's recommended width, which would leave a hero with
// zero margin before it reads as soft; 4096 buys that margin back.
export const MAX_HERO_DIMENSION = 4096;

// WebP encode quality, 0–1. Shared by both encoders — sharp takes 1–100, so a
// Node caller scales it: Math.round(COMPRESSED_QUALITY * 100).
export const COMPRESSED_QUALITY = 0.85;

// The originals kept beside cropped images, so they can be re-cropped:
// scaled to at most this on the long side and re-encoded at a high quality,
// rather than kept as uploaded. A 25 MB phone photo comes out at about 2 MB
// and looks the same; it's never shown on the site, only cropped from.
export const ORIGINAL_MAX_DIMENSION = 4096;
export const ORIGINAL_QUALITY = 0.92;
