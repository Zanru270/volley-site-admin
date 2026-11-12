import type { PageSection } from "@/lib/site";
/* The content shapes, the same in Supabase and in the main site's
   content/*.json files (../volley-site/content/README.md describes each). */

export type Banner = {
  enabled: boolean;
  text: string;
  linkText: string;
  linkHref: string;
  after: string;
};

/* The "Apply now" waitlist form's wording (settings 'waitlist_form');
   ../volley-site/content/waitlist.json has the defaults. */
export type WaitlistForm = {
  sticker: string;
  eyebrow: string;
  headline: string;
  intro: string;
  sections: { details: string; preferences: string; parent: string };
  note: string;
  unitTypes: string[];
  privacy: string;
  button: string;
  thanks: { eyebrow: string; headline: string; message: string };
};

export type ViewingSlot = {
  from: string;
  to: string;
  houses: string[];
  hosts: string;
};
export type ViewingGroup = {
  days: string;
  weekdays: number[];
  slots: ViewingSlot[];
};
/* One viewing in the timetable: the weekdays it runs on (0 = Sunday …
   6 = Saturday), its time, the buildings it's for (slugs) and its hosts. */
export type ViewingWindow = {
  weekdays: number[];
  from: string;
  to: string;
  houses: string[];
  hosts: string;
};
/* The timetable and booking rules. Saved as `windows`; one saved before
   as `schedule` (ViewingGroup) is read into windows (viewingWindows). */
export type Viewings = {
  windows: ViewingWindow[];
  rules: {
    minutes: number;
    step: number;
    noticeHours: number;
    bookAheadDays: number;
    capacity: number;
    closed: string[];
  };
};

export type FaqRow = {
  id: string;
  tab: "cool" | "boring";
  category: string;
  question: string;
  answer: string;
  list: string[];
};

export type ArticleBlock =
  | { type: "lead" | "paragraph" | "quote"; text: string }
  | { type: "image"; src: string; alt: string }
  | { type: "gallery"; images: { src: string; alt: string }[] }
  | { type: "section"; heading: string; paragraphs: string[] };

export type Article = {
  id: string;
  slug: string;
  title: string;
  location: string;
  // "YYYY-MM-DD": the articles show newest first. Null until it's set.
  date: string | null;
  // The old free-text byline, shown only while there's no date.
  meta: string;
  category: string;
  excerpt: string;
  image: string;
  hero: string;
  aspect: string;
  body: ArticleBlock[];
  published: boolean;
  sort: number;
  updated_at?: string;
};

export type RoomType = {
  label: string;
  description: string;
  images: { src: string; alt: string }[];
  fee: number | null;
  availability: string;
  badgeColor: string;
  feeNote: string;
};
/* A building's photos, by slot (volley-site/lib/locations.js describes
   each). A slot left out keeps the website's own. */
export type Photo = { src: string; alt: string };
export type PhotoBand = { image: string; sticker?: string; stickerAlt?: string };
export type BuildingPhotos = {
  card?: string;
  slides?: Photo[];
  reveal?: PhotoBand;
  // The section under the room types: its own photo, or the website's
  // "Storied Neighbourhoods" one, and its two lines (missing: the website's).
  community?: { image?: string; eyebrow?: string; title?: string };
  map?: { image: string; alt: string; width: number; height: number };
  neighbourhood?: PhotoBand;
  gallery?: Photo[];
  dad?: { image: string; alt: string };
};

/* A building's "What's included": the paragraph, then its three lists
   under fixed headings (INCLUDED_LISTS, lib/included.ts). `icon` names a
   file in the site's public/icons/included. */
export type IncludedItem = { label: string; icon: string };
export type IncludedList = "building" | "apartment" | "room";
export type Included = { intro: string } & Record<IncludedList, IncludedItem[]>;

export type Location = {
  slug: string;
  // Shown as "Volley <name>". Null keeps the website's own; missing until
  // the database has the column (supabase/building-name.sql).
  name?: string | null;
  // The number on the "amazing bedrooms available" sticker and its card.
  // Null keeps the website's own; missing until the database has the
  // column (supabase/building-beds.sql).
  beds?: number | null;
  // The word beside that number on the sticker ("amazing"). Null keeps
  // the website's; missing until the database has the column
  // (supabase/building-beds-word.sql).
  beds_word?: string | null;
  photos?: BuildingPhotos | null;
  address: string | null;
  // Its card in the Locations carousel: the badge and the line under the address.
  status: string | null;
  // The city under its name, and its closing sections' colour
  // (BUILDING_COLOURS in lib/site.ts). Null keeps the website's; missing
  // until the database has the columns (supabase/building-new.sql).
  city?: string | null;
  footer?: string | null;
  // Its name's colour over the photo on its card (a hex colour). Null keeps
  // the website's (LOCATION_NAME_COLOURS); missing until the database has
  // the column (supabase/building-card-colour.sql).
  card_colour?: string | null;
  // Whether it's on the website (VISIBILITIES in lib/site.ts). Null is
  // Automatic, which follows the status; missing until the database has the column
  // (supabase/building-visibility.sql).
  visibility?: "live" | "card" | "draft" | null;
  summary: string | null;
  description: string | string[] | null;
  pricelist: string | null;
  // The intro's buttons: false hides one. Missing until the database has
  // the column (supabase/building-buttons.sql).
  buttons?: { pricelist?: boolean; tour?: boolean } | null;
  // The tour button's link. Null keeps the website's own.
  tour?: string | null;
  // The page's sections switched off (PAGE_SECTIONS in lib/site.ts): false
  // hides one. Missing until the database has the column
  // (supabase/building-sections.sql).
  sections?: Partial<Record<PageSection, boolean>> | null;
  stats: { value: string; label: string }[] | null;
  rooms: { intro: string; paymentPlans: number[]; types: RoomType[] } | null;
  // "What's included": null (or no groups) leaves it off the page.
  included?: Included | null;
  // "A (really) great Location": its paragraphs. Null, or none, hides it.
  area?: { paragraphs: string[] } | null;
  updated_at?: string;
};

/* The home page's wording, one object per section, and the hero video
   (settings 'home'); ../volley-site/content/home.json has the defaults. */
export type HighlightCard = {
  title: string;
  note: string;
  description: string[];
  items: string[];
};
export type Review = { quote: string; name: string };
export type HomePage = {
  hero: { eyebrow: string; title: string; video: string };
  welcome: {
    marquee: string;
    // The scrolling row of logos, in order.
    logos: { src: string; alt: string }[];
    eyebrow: string;
    title: string;
    body: string;
    linkText: string;
    linkHref: string;
  };
  // Five perks, three stacked lines each.
  perks: { label: string; items: string[][] };
  locations: { title: string; intro: string };
  neighbourhoods: { eyebrow: string; title: string };
  highlights: {
    eyebrow: string;
    title: string;
    intro: string;
    amenities: HighlightCard[];
    included: HighlightCard[];
  };
  reader: { title: string; link: string; cardLink: string };
  faqs: { eyebrow: string; title: string; intro: string; handle: string };
  reviews: { title: string; items: Review[] };
  beat: { script: string; caps: string };
  newsletter: { title: string; intro: string; consent: string; button: string; done: string };
  dad: { line1: string; line2: string; script: string };
  // The three full-screen photos between sections, and their stickers.
  photos: Record<HomeBand, HomePhoto>;
};
export type HomeBand = "neighbourhoods" | "highlights" | "reader";
export type HomePhoto = { image: string; sticker: string; stickerAlt: string };

// The timetable as it may be saved: in the older shape, groups of days.
export type SavedViewings = Omit<Viewings, "windows"> & { windows?: ViewingWindow[]; schedule?: ViewingGroup[] };

// A saved timetable as its list of viewings, whichever shape it was saved in.
export function viewingWindows(saved: SavedViewings): Viewings {
  const windows =
    saved.windows ??
    (saved.schedule ?? []).flatMap((group) =>
      group.slots.map((slot) => ({ weekdays: group.weekdays, from: slot.from, to: slot.to, houses: slot.houses, hosts: slot.hosts })),
    );
  return { windows, rules: saved.rules };
}
