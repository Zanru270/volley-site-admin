"use server";

import { requireAdmin } from "@/lib/auth";
import { putSetting } from "@/lib/settings";
import { after } from "next/server";
import { revalidateSite } from "@/lib/revalidate";
import { sweepUnusedUploads } from "@/lib/media-sweep";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import type { HighlightCard, HomeBand, HomePage } from "@/lib/types";
import { HOME_PHOTOS } from "@/lib/site";

const text = (v: unknown) => String(v ?? "").trim();
const list = (v: unknown) => (Array.isArray(v) ? v : []).map(text).filter(Boolean);

const cards = (v: unknown): HighlightCard[] =>
  (Array.isArray(v) ? v : []).map((c) => ({
    title: text(c?.title),
    note: text(c?.note),
    description: list(c?.description),
    items: list(c?.items),
  }));

// A photo band as saved: one emptied goes back to the website's own.
const band = (input: HomePage, key: HomeBand) => {
  const image = text(input.photos?.[key]?.image);
  if (!image) return HOME_PHOTOS[key];
  const sticker = text(input.photos?.[key]?.sticker);
  return { image, sticker, stickerAlt: sticker ? text(input.photos?.[key]?.stickerAlt) : "" };
};

export async function saveHome(input: HomePage): Promise<Result> {
  const { supabase } = await requireAdmin();
  const home: HomePage = {
    hero: {
      eyebrow: text(input.hero?.eyebrow),
      title: text(input.hero?.title),
      video: text(input.hero?.video),
    },
    welcome: {
      marquee: text(input.welcome?.marquee),
      logos: (input.welcome?.logos ?? [])
        .map((l) => ({ src: text(l?.src), alt: text(l?.alt) }))
        .filter((l) => l.src),
      eyebrow: text(input.welcome?.eyebrow),
      title: text(input.welcome?.title),
      body: text(input.welcome?.body),
      linkText: text(input.welcome?.linkText),
      linkHref: text(input.welcome?.linkHref),
    },
    // Always five perks of three lines: the design has a place for each.
    perks: {
      label: text(input.perks?.label),
      items: Array.from({ length: 5 }, (_, i) =>
        Array.from({ length: 3 }, (_, j) => text(input.perks?.items?.[i]?.[j])),
      ),
    },
    locations: {
      title: text(input.locations?.title),
      intro: text(input.locations?.intro),
    },
    neighbourhoods: {
      eyebrow: text(input.neighbourhoods?.eyebrow),
      title: text(input.neighbourhoods?.title),
    },
    highlights: {
      eyebrow: text(input.highlights?.eyebrow),
      title: text(input.highlights?.title),
      intro: text(input.highlights?.intro),
      amenities: cards(input.highlights?.amenities),
      included: cards(input.highlights?.included),
    },
    reader: {
      title: text(input.reader?.title),
      link: text(input.reader?.link),
      cardLink: text(input.reader?.cardLink),
    },
    faqs: {
      eyebrow: text(input.faqs?.eyebrow),
      title: text(input.faqs?.title),
      intro: text(input.faqs?.intro),
      handle: text(input.faqs?.handle),
    },
    reviews: {
      title: text(input.reviews?.title),
      items: (input.reviews?.items ?? []).map((r) => ({
        quote: text(r?.quote),
        name: text(r?.name),
      })),
    },
    beat: { script: text(input.beat?.script), caps: text(input.beat?.caps) },
    newsletter: {
      title: text(input.newsletter?.title),
      intro: text(input.newsletter?.intro),
      consent: text(input.newsletter?.consent),
      button: text(input.newsletter?.button),
      done: text(input.newsletter?.done),
    },
    dad: {
      line1: text(input.dad?.line1),
      line2: text(input.dad?.line2),
      script: text(input.dad?.script),
    },
    photos: {
      neighbourhoods: band(input, "neighbourhoods"),
      highlights: band(input, "highlights"),
      reader: band(input, "reader"),
    },
  };

  if (home.hero.video && !/^(\/|https:\/\/)/.test(home.hero.video))
    return { ok: false, message: "The hero video needs to be an upload, or a path starting with /." };
  if (home.welcome.linkText && !home.welcome.linkHref)
    return { ok: false, message: "Welcome: add a link for the link text, or clear it." };
  if ([...home.highlights.amenities, ...home.highlights.included].some((c) => !c.title))
    return { ok: false, message: "Every highlight card needs a title." };
  if (!home.highlights.amenities.length || !home.highlights.included.length)
    return { ok: false, message: "Each highlights tab needs at least one card." };
  if (home.reviews.items.some((r) => !r.quote || !r.name))
    return { ok: false, message: "Every review needs a quote and a name." };
  if (!home.newsletter.button) return { ok: false, message: "The newsletter button needs a label." };

  try {
    await putSetting(supabase, "home", home);
  } catch (err) {
    return failed(err);
  }
  after(sweepUnusedUploads);
  return saved(await revalidateSite(CACHE_TAGS.HOME));
}
