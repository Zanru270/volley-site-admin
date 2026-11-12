import type { Article, Banner, HomePage, Location, WaitlistForm } from "@/lib/types";

/* The admin's half of the contract with the site's preview frames
   (../volley-site/lib/live-editor.js has the other half and the notes on
   trust). The two talk over postMessage; the names and message shapes here
   must match that file, so change both together. Each live editor talks
   about one page: the home page, or a Volley Reader article. */

export type PreviewPage = "home" | "article" | "location" | "waitlist";

export const PROTOCOL_VERSION = 1;
export const EDITOR_SOURCE = "volley-editor";
export const PREVIEW_SOURCE = "volley-preview";

/* The parts of the home page edited in a card here, not typed in place.
   The site marks each with data-edit="<id>". */
export const HOME_FIELDS = [
  "banner",
  "hero.video",
  "welcome.logos",
  "welcome.link",
  "locations.cards",
  "highlights.cards",
  "reader.articles",
  "faqs.list",
  "reviews.items",
  "photos.neighbourhoods",
  "photos.highlights",
  "photos.reader",
] as const;
export type HomeField = (typeof HOME_FIELDS)[number];

// An article's: its photos, its date, and its body's blocks.
export const ARTICLE_FIELDS = ["photos", "date", "body"] as const;
export type ArticleField = (typeof ARTICLE_FIELDS)[number];

// A building's: each photo slot, the room types, and the price list.
export const LOCATION_FIELDS = [
  "slides",
  "reveal",
  "community",
  "map",
  "neighbourhood",
  "gallery",
  "dad",
  "rooms",
  "included",
  "area",
  "pricelist",
] as const;
export type LocationField = (typeof LOCATION_FIELDS)[number];

// The waitlist form's: its unit types, a list set in a card.
export const WAITLIST_FIELDS = ["unitTypes"] as const;
export type WaitlistField = (typeof WAITLIST_FIELDS)[number];

type FieldOf<P extends PreviewPage> = P extends "home"
  ? HomeField
  : P extends "article"
    ? ArticleField
    : P extends "waitlist"
      ? WaitlistField
      : LocationField;
const FIELDS: Record<PreviewPage, readonly string[]> = {
  home: HOME_FIELDS,
  article: ARTICLE_FIELDS,
  location: LOCATION_FIELDS,
  waitlist: WAITLIST_FIELDS,
};

const isFieldOf = <P extends PreviewPage>(page: P, value: unknown): value is FieldOf<P> =>
  typeof value === "string" && FIELDS[page].includes(value);

/** Where a part of the page is inside the preview frame, in its own pixels. */
export type FrameRect = { x: number; y: number; width: number; height: number };

// The home page being edited, with the announcement banner along the top of it.
export type HomeDraft = HomePage & { banner: Banner };

export type DraftOf<P extends PreviewPage> = P extends "home"
  ? HomeDraft
  : P extends "article"
    ? Article
    : P extends "waitlist"
      ? WaitlistForm
      : Location;

export type EditorMessage<P extends PreviewPage> =
  | { type: "draft"; draft: DraftOf<P> }
  // `index`: which of a repeating part (an article's photo blocks).
  // `photo`: the photo picked in a gallery's card, for its carousel to turn to.
  | { type: "highlight"; field: FieldOf<P> | null; index?: number | null; photo?: number | null };

/* Blocks of an article's body moved, added or removed on the page, by
   its controls there (../volley-site/components/BlockOverlay.jsx). */
export const BLOCK_KINDS = ["lead", "paragraph", "section", "quote", "image", "gallery"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];
export type BlockAction =
  | { type: "move"; from: number; to: number }
  | { type: "insert"; at: number; kind: BlockKind }
  | { type: "remove"; at: number };

export type PreviewMessage<P extends PreviewPage> =
  | { type: "ready" }
  | { type: "select"; field: FieldOf<P> | null; rect: FrameRect | null; index?: number }
  | { type: "rect"; field: FieldOf<P>; rect: FrameRect; index?: number }
  | { type: "edit"; key: string; value: string }
  // Only ever parsed from an article's page.
  | BlockAction;

function parseRect(value: unknown): FrameRect | null {
  if (!value || typeof value !== "object") return null;
  const { x, y, width, height } = value as Record<string, unknown>;
  return [x, y, width, height].every((n) => typeof n === "number" && Number.isFinite(n))
    ? { x: x as number, y: y as number, width: width as number, height: height as number }
    : null;
}

const isPlace = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 1000;

/** A message from `page`'s preview frame, or null when it isn't one of ours. */
export function parsePreviewMessage<P extends PreviewPage>(data: unknown, page: P): PreviewMessage<P> | null {
  if (!data || typeof data !== "object") return null;
  const m = data as Record<string, unknown>;
  if (m.source !== PREVIEW_SOURCE || m.v !== PROTOCOL_VERSION) return null;
  switch (m.type) {
    case "ready":
      return { type: "ready" };
    case "select":
      return isFieldOf(page, m.field)
        ? { type: "select", field: m.field, rect: parseRect(m.rect), ...(isPlace(m.index) ? { index: m.index } : {}) }
        : { type: "select", field: null, rect: null };
    case "rect": {
      const rect = parseRect(m.rect);
      return isFieldOf(page, m.field) && rect
        ? { type: "rect", field: m.field, rect, ...(isPlace(m.index) ? { index: m.index } : {}) }
        : null;
    }
    case "edit":
      return typeof m.key === "string" && typeof m.value === "string" && m.value.length <= 5000
        ? { type: "edit", key: m.key, value: m.value }
        : null;
    // The rest only come from an article's page; the editor checks the
    // places against its draft.
    case "move":
      return page === "article" && isPlace(m.from) && isPlace(m.to)
        ? ({ type: "move", from: m.from, to: m.to } as PreviewMessage<P>)
        : null;
    case "insert":
      return page === "article" && isPlace(m.at) && (BLOCK_KINDS as readonly unknown[]).includes(m.kind)
        ? ({ type: "insert", at: m.at, kind: m.kind } as PreviewMessage<P>)
        : null;
    case "remove":
      return page === "article" && isPlace(m.at) ? ({ type: "remove", at: m.at } as PreviewMessage<P>) : null;
    default:
      return null;
  }
}

/* Never typed in place, but set in cards: on the home page its uploads,
   links and reviews; on an article everything but its wording. */
export const HOME_NOT_INLINE = /^(hero\.video|welcome\.linkHref|welcome\.logos\b|reviews\.|photos\.)/;
export const LOCATION_NOT_INLINE =
  /^(slug|photos|pricelist|status|summary|sort|updated_at|rooms\.(paymentPlans|types\.\d+\.(images|fee|badgeColor|label))|included\.\w+\.\d+\.icon)\b/;
// The waitlist form's unit types are a list, set in its card.
export const WAITLIST_NOT_INLINE = /^unitTypes\b/;
export const ARTICLE_NOT_INLINE = /^(id|slug|date|meta|image|hero|aspect|excerpt|published|sort|updated_at|body\.\d+\.(type|src|alt|images))\b/;

/* Text typed on the preview, applied to the draft. `key` is the text's
   place in the page's content ("hero.title", "perks.items.2.0",
   "body.3.paragraphs.1"). Only a place that already holds text is ever
   written, and none `blocked` matches, so the page can change wording and
   nothing else: it can't add keys, or reach photos, videos or links. */
export function applyInlineEdit<T extends object>(page: T, key: string, value: string, blocked: RegExp): T {
  const path = key.split(".");
  if (path.length < 1 || path.length > 6 || blocked.test(key)) return page;
  const next = structuredClone(page);
  let node: unknown = next;
  for (const part of path.slice(0, -1)) {
    if (!node || typeof node !== "object" || !Object.hasOwn(node, part)) return page;
    node = (node as Record<string, unknown>)[part];
  }
  const last = path[path.length - 1];
  if (!node || typeof node !== "object" || !Object.hasOwn(node, last)) return page;
  const holder = node as Record<string, unknown>;
  if (typeof holder[last] !== "string" || holder[last] === value) return page;
  holder[last] = value;
  return next;
}
