import type { HomeBand, HomePhoto } from "@/lib/types";

/* A file path as the admin can show it. Paths like "/images/x.webp" are
   the public site's own files, so they're loaded from the site; uploaded
   files are already full Supabase URLs. */
export function siteAsset(src: string | null | undefined): string {
  if (!src) return "";
  if (/^https?:\/\//.test(src)) return src;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return `${site}${src.startsWith("/") ? "" : "/"}${src}`;
}

// Each building's name as the website's code has it, until it's renamed.
export const LOCATION_NAMES: Record<string, string> = {
  brooklyn: "Volley Brooklyn",
  baileys: "Volley Baileys",
  roper: "Volley Roper",
  mooiriver: "Volley Mooiriver",
};

// A building's name as the admin shows it: "Volley <name>" once renamed, the website's own until then.
export const buildingName = (b: { slug: string; name?: string | null }) =>
  b.name?.trim() ? `Volley ${b.name.trim()}` : (LOCATION_NAMES[b.slug] ?? b.slug);

/* The home page's three full-screen photos as the website has them
   (../volley-site/content/home.json, `photos`): what a page saved before
   they could be changed shows, and what one emptied goes back to. */
export const HOME_PHOTOS: Record<HomeBand, HomePhoto> = {
  neighbourhoods: { image: "/images/VibrantCommunities.png", sticker: "", stickerAlt: "" },
  highlights: {
    image: "/images/StudentsLauging.png",
    sticker: "/images/First_In_Class_Sticker.svg",
    stickerAlt: "Brooklyn: first (in) class student accommodation",
  },
  reader: {
    image: "/images/Volley_Brooklyn_Plato_Side.png",
    sticker: "/images/Volley_Brooklyn_Sticker.svg",
    stickerAlt: "Volley Brooklyn, Pretoria",
  },
};

// A saved home page with its photos filled in (see HOME_PHOTOS).
export const withHomePhotos = <T extends { photos?: Partial<Record<HomeBand, HomePhoto>> }>(home: T) => ({
  ...home,
  photos: {
    neighbourhoods: home.photos?.neighbourhoods ?? HOME_PHOTOS.neighbourhoods,
    highlights: home.photos?.highlights ?? HOME_PHOTOS.highlights,
    reader: home.photos?.reader ?? HOME_PHOTOS.reader,
  },
});

/* The sections of a building's page that can be switched off, in page
   order (../volley-site/lib/locations.js PAGE_SECTIONS: keep the keys in
   step). Every building has all of them. `needs`: what the section shows
   nothing without, so the website leaves it off until it's there. */
export const PAGE_SECTIONS = [
  { key: "reveal", label: "Photo under the intro", needs: "a photo" },
  { key: "rooms", label: "Room types & availability", needs: "room types" },
  { key: "community", label: "Under the room types (Storied Neighbourhoods)" },
  { key: "included", label: "What's included", needs: "a list with something in it" },
  { key: "map", label: "Map", needs: "a map" },
  { key: "area", label: "A (really) great Location", needs: "a paragraph" },
  { key: "neighbourhood", label: 'Photo under "A (really) great Location"', needs: "a photo" },
  { key: "gallery", label: "Take a look around" },
  { key: "similar", label: "Similar locations" },
  { key: "beat", label: "Beat average" },
  { key: "newsletter", label: "Newsletter sign-up" },
  { key: "dad", label: "The res your dad wishes he went to" },
] as const;
export type PageSection = (typeof PAGE_SECTIONS)[number]["key"];

// What a location card's status badge can say; the first is the default.
// "Opening" carries its year, and is saved as "Opening 2028".
export const LOCATION_STATUSES = ["Open", "Coming soon", "Opening"];

// The kind of status a saved one is: "Opening 2028" is "Opening".
export const statusKind = (status: string | null | undefined) =>
  status?.startsWith("Opening") ? "Opening" : (status ?? LOCATION_STATUSES[0]);

// The year in an "Opening" status, or "".
export const openingYear = (status: string | null | undefined) => /^Opening (\d{4})$/.exec(status ?? "")?.[1] ?? "";

// A status that can be saved: one of the plain ones, or "Opening" and a year.
export const isStatus = (status: string) =>
  (LOCATION_STATUSES.includes(status) && status !== "Opening") || /^Opening \d{4}$/.test(status);

/* The colour of each card's name over its photo, as the website has it
   until one's picked (card_colour); any other building's is bone. Keep in
   step with NAME_COLOURS in the site's lib/locations.js. */
export const LOCATION_NAME_COLOURS: Record<string, string> = {
  brooklyn: "#F6EB6D",
  baileys: "#90CDF4",
  roper: "#F3AD55",
  mooiriver: "#90CDF4",
};
export const DEFAULT_NAME_COLOUR = "#E8E5D8";

// The swatches the card's name colour picker offers: the site's palette.
export const NAME_COLOUR_SWATCHES = [
  { value: "#F6EB6D", label: "Yellow" },
  { value: "#90CDF4", label: "Sky" },
  { value: "#F3AD55", label: "Orange" },
  { value: "#C5FF98", label: "Lemon" },
  { value: "#FF9F9A", label: "Pink" },
  { value: "#E8E5D8", label: "Bone" },
  { value: "#FFFFFF", label: "White" },
];

// A colour the picker can save: #rgb or #rrggbb.
export const isHexColour = (value: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);

// The colours a building's closing sections and footer can take (its
// `footer`), as the website names them.
export const BUILDING_COLOURS = [
  { value: "pink", label: "Pink" },
  { value: "red", label: "Red" },
  { value: "blue", label: "Blue" },
  { value: "orange", label: "Orange" },
  { value: "lemon", label: "Lemon" },
];

/* Whether a building is on the website (`visibility` on its row): live,
   its page open to all; card, its card and menu entry show but don't
   link, its page a "you're early" one; draft, on no list at all, and the
   same page. Automatic (saved as null) follows the status
   (effectiveVisibility). */
export const VISIBILITIES = [
  { value: "auto", label: "Automatic", hint: "Follows the status: Open is live, Coming soon or Opening is card only." },
  { value: "live", label: "Live", hint: "Its card links to its page, open to everyone." },
  { value: "card", label: "Card only", hint: "Its card shows, but doesn't link anywhere: its page isn't open yet." },
  { value: "draft", label: "Draft", hint: "Hidden on the website: no card, and its page isn't open." },
] as const;
export type Visibility = (typeof VISIBILITIES)[number]["value"];

/* What a building's visibility comes to: its own choice, or on Automatic,
   what its status makes it. Keep in step with visibilityOf in the site's
   lib/locations.js. */
export const effectiveVisibility = (status: string | null | undefined, visibility: string | null | undefined) =>
  visibility === "live" || visibility === "card" || visibility === "draft"
    ? visibility
    : statusKind(status) === "Open"
      ? "live"
      : "card";

/* The parts of a location's card that live in the site's code
   (../volley-site/lib/locations.js: `beds` and the first of `slides`),
   copied here for the card previews. `tour`: the "Watch the official
   tour" button's link, where the website has one. */
export const LOCATION_CARDS: Record<string, { beds: number; photo: string; tour?: string }> = {
  brooklyn: { beds: 170, photo: "/images/Volley_Brooklyn_Plato_Front.jpg" },
  baileys: { beds: 140, photo: "/images/Volley_Baylies_Front.jpg", tour: "https://www.youtube.com/watch?v=9a8McDfJl8o" },
  roper: { beds: 156, photo: "/images/Volley_Roper_Front.png" },
  mooiriver: { beds: 331, photo: "/images/Volley_Mooirevier_Front.png" },
};
