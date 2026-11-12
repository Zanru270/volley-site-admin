"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidateSite } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import { BUILDING_COLOURS, isHexColour, isStatus, LOCATION_NAMES, PAGE_SECTIONS, VISIBILITIES, type Visibility } from "@/lib/site";
import { after } from "next/server";
import { deleteUploads } from "@/lib/media-actions";
import { sweepUnusedUploads } from "@/lib/media-sweep";
import { photoUrls } from "@/lib/photos";
import type { BuildingPhotos, Included, Location, Photo } from "@/lib/types";
import { INCLUDED_LISTS } from "@/lib/included";

const orNull = <T,>(v: T | "" | null | undefined) =>
  v === "" || v === undefined ? null : v;

const text = (v: unknown) => String(v ?? "").trim();
const photoList = (list: Photo[] | undefined) =>
  (list ?? []).map((p) => ({ src: text(p.src), alt: text(p.alt) })).filter((p) => p.src);

/* The section under the room types as saved: its photo and its lines, kept
   while it has either (the lines stay with no photo of its own). */
function cleanCommunity(c: BuildingPhotos["community"]): BuildingPhotos["community"] {
  if (!c) return undefined;
  const image = text(c.image);
  const out = {
    ...(image ? { image } : {}),
    ...(typeof c.eyebrow === "string" ? { eyebrow: c.eyebrow.trim() } : {}),
    ...(typeof c.title === "string" ? { title: c.title.trim() } : {}),
  };
  return Object.keys(out).length ? out : undefined;
}

/* A building's photos as saved: empty slots and list entries dropped, so
   the website keeps its own photo for any slot left empty. */
function cleanPhotos(input: BuildingPhotos | null | undefined): BuildingPhotos | null {
  if (!input) return null;
  const band = (b: BuildingPhotos["reveal"]) =>
    b?.image ? { image: text(b.image), sticker: text(b.sticker) || undefined, stickerAlt: text(b.stickerAlt) || undefined } : undefined;
  const out: BuildingPhotos = {
    card: text(input.card) || undefined,
    slides: photoList(input.slides),
    reveal: band(input.reveal),
    community: cleanCommunity(input.community),
    map: input.map?.image
      ? { image: text(input.map.image), alt: text(input.map.alt), width: Number(input.map.width) || 0, height: Number(input.map.height) || 0 }
      : undefined,
    neighbourhood: band(input.neighbourhood),
    gallery: photoList(input.gallery),
    dad: input.dad?.image ? { image: text(input.dad.image), alt: text(input.dad.alt) } : undefined,
  };
  if (!out.slides?.length) delete out.slides;
  if (!out.gallery?.length) delete out.gallery;
  for (const key of Object.keys(out) as (keyof BuildingPhotos)[]) if (out[key] === undefined) delete out[key];
  return Object.keys(out).length ? out : null;
}

/* "What's included" as saved: blank entries dropped. With every list
   empty it's still kept (not null), so the section stays off the page
   rather than falling back to the website's own lists. */
function cleanIncluded(input: Included | null | undefined): Included | null {
  if (!input) return null;
  const out = { intro: text(input.intro) } as Included;
  for (const [key] of INCLUDED_LISTS)
    out[key] = (input[key] ?? [])
      .map((item) => ({ label: text(item.label), icon: text(item.icon) }))
      .filter((item) => item.label);
  return out;
}

function cleanSections(input: Location["sections"]): Location["sections"] {
  const off = PAGE_SECTIONS.filter(({ key }) => input?.[key] === false).map(({ key }) => [key, false]);
  return off.length ? Object.fromEntries(off) : null;
}

const COLOUR_MESSAGE = "The name's colour needs to be a hex colour, e.g. #F6EB6D.";
const STATUS_MESSAGE = 'The status needs to be "Open", "Coming soon", or "Opening" with a year, e.g. 2028.';

export async function saveLocation(input: Location): Promise<Result> {
  const { supabase } = await requireAdmin();
  const paragraphs = (
    Array.isArray(input.description) ? input.description : [input.description ?? ""]
  )
    .map((p) => p.trim())
    .filter(Boolean);
  const stats = (input.stats ?? []).filter((s) => s.value.trim() || s.label.trim());
  const rooms = input.rooms && {
    intro: input.rooms.intro.trim(),
    paymentPlans: input.rooms.paymentPlans.filter((n) => Number.isInteger(n) && n > 0),
    types: input.rooms.types.map((t) => ({
      ...t,
      label: t.label.trim(),
      images: t.images.filter((img) => img.src.trim()),
      fee: t.fee === null || Number.isNaN(t.fee) ? null : t.fee,
    })),
  };
  const status = input.status?.trim() || "Open";
  if (!isStatus(status)) return { ok: false, message: STATUS_MESSAGE };
  if (input.card_colour && !isHexColour(input.card_colour.trim()))
    return { ok: false, message: COLOUR_MESSAGE };
  if (input.footer && !BUILDING_COLOURS.some((c) => c.value === input.footer))
    return { ok: false, message: "That colour isn't one of the choices." };
  if (rooms?.types.some((t) => !t.label))
    return { ok: false, message: "Every room type needs a name." };
  const included = cleanIncluded(input.included);
  // Kept with no paragraphs (not null), so the section stays off the page.
  const area = input.area ? { paragraphs: input.area.paragraphs.map((p) => p.trim()).filter(Boolean) } : null;
  const tour = input.tour?.trim();
  if (tour && !/^https?:\/\/\S+$/.test(tour))
    return { ok: false, message: "The tour link needs to be a full web address, starting with https://." };
  if (input.beds != null && !(Number.isInteger(input.beds) && input.beds > 0))
    return { ok: false, message: "The number of bedrooms needs to be a whole number above 0." };
  if (rooms && !rooms.paymentPlans.length)
    return { ok: false, message: "Add at least one payment plan (e.g. 12)." };

  const photos = cleanPhotos(input.photos);
  if (photos?.map && (!photos.map.width || !photos.map.height))
    return { ok: false, message: "The map's size couldn't be read. Upload it again." };
  // What it used before, to clear away the photos this save replaces.
  const { data: before } = await supabase.from("locations").select("photos").eq("slug", input.slug).maybeSingle();

  const row = {
    ...(input.photos !== undefined ? { photos } : {}),
    ...(input.name !== undefined ? { name: orNull(input.name?.trim()) } : {}),
    ...(input.beds !== undefined ? { beds: input.beds } : {}),
    ...(input.beds_word !== undefined ? { beds_word: orNull(input.beds_word?.trim()) } : {}),
    ...(input.city !== undefined ? { city: orNull(input.city?.trim()) } : {}),
    ...(input.card_colour !== undefined ? { card_colour: orNull(input.card_colour?.trim()) } : {}),
    ...(input.footer !== undefined ? { footer: orNull(input.footer) } : {}),
    address: orNull(input.address?.trim()),
    status,
    summary: orNull(input.summary?.trim()),
    description: paragraphs.length ? paragraphs : null,
    pricelist: orNull(input.pricelist?.trim()),
    ...(input.tour !== undefined ? { tour: orNull(tour) } : {}),
    // Only the ones switched off are kept; none off is null.
    ...(input.sections !== undefined ? { sections: cleanSections(input.sections) } : {}),
    ...(input.buttons !== undefined
      ? { buttons: input.buttons && { pricelist: input.buttons.pricelist !== false, tour: input.buttons.tour !== false } }
      : {}),
    stats: stats.length ? stats : null,
    rooms: rooms && rooms.types.length ? rooms : null,
    ...(input.included !== undefined ? { included } : {}),
    ...(input.area !== undefined ? { area } : {}),
  };
  const { data, error } = await supabase
    .from("locations")
    .update(row)
    .eq("slug", input.slug)
    .select("slug");
  // PGRST204: a column the database doesn't have yet.
  if (error?.code === "PGRST204")
    return {
      ok: false,
      message:
        "Couldn't save: the database needs a one-off update first. Ask whoever set up the admin to run supabase/building-card-colour.sql, building-new.sql, building-beds-word.sql, building-beds.sql, building-buttons.sql, building-sections.sql and building-name.sql (and, if it's never been run, building-order.sql, building-photos.sql, whats-included.sql and location-area.sql).",
    };
  if (error) return failed(error);
  if (!data?.length) return { ok: false, message: "Couldn't save: not allowed (0 rows saved)." };
  // Photos this save replaced or removed: nothing uses them now.
  if (input.photos !== undefined) {
    const kept = new Set(photoUrls(photos));
    await deleteUploads(photoUrls(before?.photos).filter((url) => !kept.has(url)));
  }
  after(sweepUnusedUploads);
  return saved(await revalidateSite(CACHE_TAGS.LOCATIONS));
}

/* Saves the order the buildings show in on the website (the Locations
   carousel, and "Similar locations" on each building's page): `slugs`
   first to last. */
export async function saveBuildingOrder(slugs: string[]): Promise<Result> {
  const { supabase } = await requireAdmin();
  try {
    for (const [sort, slug] of slugs.entries()) {
      const { data, error } = await supabase.from("locations").update({ sort }).eq("slug", slug).select("slug");
      if (error) throw error;
      if (!data?.length) throw new Error("not allowed (0 rows saved)");
    }
  } catch (err) {
    if ((err as { code?: string }).code === "PGRST204")
      return {
        ok: false,
        message:
          'Couldn\'t save: the database is missing the order column. Run the "sort" line under Locations in supabase/schema.sql once, in Supabase\'s SQL editor.',
      };
    return failed(err);
  }
  return saved(await revalidateSite(CACHE_TAGS.LOCATIONS));
}

/* Saves only what a building's card says (from the home page's editor):
   its status, address, card description and card photo. The rest of the
   building is left as it is. */
export async function saveBuildingCard(
  slug: string,
  card: { name?: string; status: string; address: string; summary: string; photo: string; nameColour?: string },
): Promise<Result> {
  const { supabase } = await requireAdmin();
  const status = card.status.trim() || "Open";
  if (!isStatus(status)) return { ok: false, message: STATUS_MESSAGE };
  const nameColour = card.nameColour?.trim();
  if (nameColour && !isHexColour(nameColour)) return { ok: false, message: COLOUR_MESSAGE };
  const { data: before, error: readError } = await supabase
    .from("locations")
    .select("photos")
    .eq("slug", slug)
    .maybeSingle();
  if (readError) return failed(readError);
  const old = (before?.photos ?? {}) as BuildingPhotos;
  const photo = text(card.photo);
  const photos = cleanPhotos({ ...old, card: photo || undefined });

  const { data, error } = await supabase
    .from("locations")
    .update({
      ...(card.name !== undefined ? { name: orNull(card.name.trim()) } : {}),
      ...(card.nameColour !== undefined ? { card_colour: orNull(nameColour ?? "") } : {}),
      status,
      address: orNull(card.address.trim()),
      summary: orNull(card.summary.trim()),
      photos,
    })
    .eq("slug", slug)
    .select("slug");
  if (error?.code === "PGRST204")
    return {
      ok: false,
      message:
        "Couldn't save: the database needs a one-off update first. Ask whoever set up the admin to run supabase/building-photos.sql, supabase/building-name.sql and supabase/building-card-colour.sql.",
    };
  if (error) return failed(error);
  if (!data?.length) return { ok: false, message: "Couldn't save: not allowed (0 rows saved)." };
  // The card photo this replaced, unless the building still uses it elsewhere.
  if (old.card && old.card !== photo && !photoUrls(photos).includes(old.card)) await deleteUploads([old.card]);
  return saved(await revalidateSite(CACHE_TAGS.LOCATIONS));
}

/* Whether a building is on the website (VISIBILITIES in lib/site.ts):
   saved the moment it's picked, apart from the rest of the building. */
export async function saveBuildingVisibility(slug: string, visibility: Visibility): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!VISIBILITIES.some((v) => v.value === visibility)) return { ok: false, message: "That isn't one of the choices." };
  const { data, error } = await supabase
    .from("locations")
    // Automatic is no choice of its own: null, which follows the status.
    .update({ visibility: visibility === "auto" ? null : visibility })
    .eq("slug", slug)
    .select("slug");
  if (error?.code === "PGRST204")
    return {
      ok: false,
      message:
        "Couldn't save: the database needs a one-off update first. Run supabase/building-visibility.sql once, in Supabase's SQL editor.",
    };
  if (error) return failed(error);
  if (!data?.length) return { ok: false, message: "Couldn't save: not allowed (0 rows saved)." };
  return saved(await revalidateSite(CACHE_TAGS.LOCATIONS));
}

/* Adds a building from blank: its name, the address its page gets (made
   from the name), and nothing else, as a draft with "Coming soon", last in
   the order. The website draws its page from what's then filled in.
   Resolves to its slug, to open its editor. */
export async function createBuilding(input: { name: string; city: string }): Promise<Result & { slug?: string }> {
  const { supabase } = await requireAdmin();
  const name = input.name.trim().replace(/^volley\s+/i, "");
  if (!name) return { ok: false, message: "Give the building a name." };
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) return { ok: false, message: "The name needs a letter or number in it." };

  const { data: rows, error: readError } = await supabase.from("locations").select("slug, sort");
  if (readError) return failed(readError);
  if (rows.some((r) => r.slug === slug) || slug in LOCATION_NAMES)
    return { ok: false, message: `There's already a building called "${name}". Pick another name.` };
  const sort = Math.max(-1, ...rows.map((r) => r.sort ?? -1)) + 1;

  const { error } = await supabase.from("locations").insert({
    slug,
    name,
    status: "Coming soon",
    visibility: "draft",
    sort,
    ...(input.city.trim() ? { city: input.city.trim() } : {}),
  });
  if (error?.code === "PGRST204")
    return {
      ok: false,
      message:
        "Couldn't add it: the database needs a one-off update first. Run supabase/building-new.sql and supabase/building-visibility.sql once, in Supabase's SQL editor.",
    };
  if (error) return failed(error);
  return { ...saved(await revalidateSite(CACHE_TAGS.LOCATIONS)), slug };
}
