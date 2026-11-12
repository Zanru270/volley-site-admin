"use client";

import { Field, inputClass, labelClass } from "@/components/ui";
import ImageUploader from "@/components/ImageUploader";
import PhotoGallery from "@/components/PhotoGallery";
import { FOCAL_PREVIEWS, SLOT_ASPECTS, type ImagePreset } from "@/lib/imageConstants";
import { siteAsset } from "@/lib/site";
import type { BuildingPhotos, PhotoBand } from "@/lib/types";

/* Every photo on a building's page (its card's is with the card details,
   CardFields.tsx), slot by slot: the galleries as grids of thumbnails
   (components/PhotoGallery.tsx), the rest each with the Bow + Arc
   uploader: crop it to its slot's shape, or give it a focal point where
   the site shows it at several. A slot left empty shows the website's own
   photo. `onNewUpload` hears of every upload, so the editor can clear away
   the ones it doesn't end up saving. */

export const FOLDER = "buildings";

// A building's galleries: the slideshow and "Take a look around".
export type GalleryField = "slides" | "gallery";

// The uploader as each slot needs it.
export function Upload({
  value,
  onChange,
  preset,
  label,
  focal,
  aspect,
  onNewUpload,
}: {
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  preset: ImagePreset;
  label?: string;
  focal?: keyof typeof FOCAL_PREVIEWS;
  aspect?: number;
  onNewUpload: (url: string) => void;
}) {
  return (
    <ImageUploader
      value={value || null}
      onChange={(url) => onChange(url ?? undefined)}
      onNewUpload={onNewUpload}
      preset={preset}
      label={label}
      focalPreviews={focal ? FOCAL_PREVIEWS[focal] : undefined}
      aspect={aspect}
      folder={FOLDER}
    />
  );
}

// A full-screen photo band, with the sticker that can sit on it.
export function Band({
  band,
  onChange,
  onNewUpload,
}: {
  band: PhotoBand | undefined;
  onChange: (band: PhotoBand | undefined) => void;
  onNewUpload: (url: string) => void;
}) {
  const set = (patch: Partial<PhotoBand>) => {
    const next = { image: "", ...band, ...patch };
    onChange(next.image || next.sticker ? next : undefined);
  };
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
      <Upload
        value={band?.image}
        onChange={(image) => set({ image: image ?? "" })}
        preset="hero"
        focal="screen"
        onNewUpload={onNewUpload}
      />
      <div className="space-y-2">
        <span className={labelClass}>Sticker (optional)</span>
        <Upload
          value={band?.sticker}
          onChange={(sticker) => set({ sticker })}
          preset="logo"
          label="Upload a sticker"
          onNewUpload={onNewUpload}
        />
        {band?.sticker && (
          <input
            value={band.stickerAlt ?? ""}
            onChange={(e) => set({ stickerAlt: e.target.value })}
            placeholder="What the sticker says"
            aria-label="Sticker description"
            className={inputClass}
          />
        )}
      </div>
    </div>
  );
}

// The website's own two lines over the section under the room types.
export const COMMUNITY_DEFAULTS = { eyebrow: "Vibrant Communities. Inspired Living.", title: "Storied Neighbourhoods" };

type Community = NonNullable<BuildingPhotos["community"]>;

// The section with `patch` written in; gone once it has neither a photo nor lines of its own.
export const withCommunity = (c: BuildingPhotos["community"], patch: Partial<Community>): BuildingPhotos["community"] => {
  const next: Community = { ...c, ...patch };
  if (!next.image) delete next.image;
  return next.image || next.eyebrow !== undefined || next.title !== undefined ? next : undefined;
};

/* The section under the room types: its photo (empty: the website's
   "Storied Neighbourhoods" one) and its two lines, which can also be
   typed straight onto the page. Emptied, a line is hidden. */
export function CommunityFields({
  community,
  onChange,
  onNewUpload,
}: {
  community: BuildingPhotos["community"];
  onChange: (community: BuildingPhotos["community"]) => void;
  onNewUpload: (url: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Upload
        value={community?.image}
        onChange={(image) => onChange(withCommunity(community, { image: image ?? "" }))}
        preset="hero"
        focal="screen"
        onNewUpload={onNewUpload}
      />
      <p className="text-xs text-ink/50">Empty shows the website&apos;s own photo.</p>
      <Field label="Small line" hint="Empty hides it.">
        <input
          value={community?.eyebrow ?? COMMUNITY_DEFAULTS.eyebrow}
          onChange={(e) => onChange(withCommunity(community, { eyebrow: e.target.value }))}
          className={inputClass}
        />
      </Field>
      <Field label="Big line" hint="Empty hides it.">
        <input
          value={community?.title ?? COMMUNITY_DEFAULTS.title}
          onChange={(e) => onChange(withCommunity(community, { title: e.target.value }))}
          className={inputClass}
        />
      </Field>
    </div>
  );
}

// The map's own pixel size, which the site lays it out at: read once it's uploaded.
export function readSize(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = siteAsset(url);
  });
}

// The photo slots of a building's page, each edited on its own (PhotoSlot).
export type PhotoSlotKey = "slides" | "reveal" | "community" | "map" | "neighbourhood" | "gallery" | "dad";

/* One of a building's photo slots, as the form view edits it, each in the
   section of the page it's in. An empty slot shows the website's own photo. */
export function PhotoSlot({
  slot,
  photos,
  onChange,
  onNewUpload,
  onFocusPhoto,
}: {
  slot: PhotoSlotKey;
  photos: BuildingPhotos;
  onChange: (photos: BuildingPhotos) => void;
  onNewUpload: (url: string) => void;
  // The photo open in the slideshow's or gallery's grid, for the page to show.
  onFocusPhoto?: (field: GalleryField, index: number | null) => void;
}) {
  const set = <K extends keyof BuildingPhotos>(key: K, value: BuildingPhotos[K]) => onChange({ ...photos, [key]: value });

  switch (slot) {
    case "slides":
      return (
        <PhotoGallery
          photos={photos.slides ?? []}
          onChange={(slides) => set("slides", slides)}
          preset="slide"
          focal="slide"
          folder={FOLDER}
          firstLabel="Shows first"
          onNewUpload={onNewUpload}
          onFocusPhoto={(i) => onFocusPhoto?.("slides", i)}
        />
      );
    case "reveal":
      return <Band band={photos.reveal} onChange={(reveal) => set("reveal", reveal)} onNewUpload={onNewUpload} />;
    case "community":
      return (
        <CommunityFields community={photos.community} onChange={(community) => set("community", community)} onNewUpload={onNewUpload} />
      );
    case "map":
      return (
        <>
          <Upload
            value={photos.map?.image}
            onChange={async (image) => {
              if (!image) return set("map", undefined);
              const size = await readSize(image);
              set("map", { alt: photos.map?.alt ?? "", image, width: size?.width ?? 0, height: size?.height ?? 0 });
            }}
            preset="map"
            aspect={SLOT_ASPECTS.map}
            onNewUpload={onNewUpload}
          />
        </>
      );
    case "neighbourhood":
      return (
        <Band band={photos.neighbourhood} onChange={(neighbourhood) => set("neighbourhood", neighbourhood)} onNewUpload={onNewUpload} />
      );
    case "gallery":
      return (
        <PhotoGallery
          photos={photos.gallery ?? []}
          onChange={(gallery) => set("gallery", gallery)}
          preset="gallery"
          folder={FOLDER}
          firstLabel="Shows first"
          onNewUpload={onNewUpload}
          onFocusPhoto={(i) => onFocusPhoto?.("gallery", i)}
        />
      );
    case "dad":
      return (
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
          <Upload
            value={photos.dad?.image}
            onChange={(image) => set("dad", image ? { alt: photos.dad?.alt ?? "", image } : undefined)}
            preset="feature"
            aspect={SLOT_ASPECTS.feature}
            onNewUpload={onNewUpload}
          />
        </div>
      );
  }
}
