import { LOCATION_CARDS } from "@/lib/site";
import type { BuildingPhotos } from "@/lib/types";

// Every photo URL a building's photos use, sticker files included.
export function photoUrls(photos: BuildingPhotos | null | undefined): string[] {
  if (!photos) return [];
  return [
    photos.card,
    ...(photos.slides ?? []).map((p) => p.src),
    photos.reveal?.image,
    photos.reveal?.sticker,
    photos.community?.image,
    photos.map?.image,
    photos.neighbourhood?.image,
    photos.neighbourhood?.sticker,
    ...(photos.gallery ?? []).map((p) => p.src),
    photos.dad?.image,
  ].filter((url): url is string => Boolean(url));
}

/* The photo on a building's card, as the website picks it: its card photo,
   else its first slide, else the one in the website's code. */
export function cardPhoto(slug: string, photos: BuildingPhotos | null | undefined): string | undefined {
  return photos?.card || photos?.slides?.[0]?.src || LOCATION_CARDS[slug]?.photo;
}
