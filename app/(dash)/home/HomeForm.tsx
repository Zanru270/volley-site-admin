"use client";

import { ArrowRight } from "lucide-react";
import { button, CountChip, inputClass, labelClass, subPanel } from "@/components/ui";
import FormSections from "@/components/FormSections";
import { VideoField } from "@/components/Upload";
import { buildingName, HOME_PHOTOS, type Visibility } from "@/lib/site";
import type { Banner, FaqRow, HomeBand, HomePage, HomePhoto, Location } from "@/lib/types";
import CardFields, { type CardDetails } from "../buildings/CardFields";
import { Band } from "../buildings/PhotosEditor";
import FaqManager from "./FaqManager";
import { Area, BannerFields, HighlightTabs, LogosList, ReviewsList, Text } from "./fields";

type CardLocation = Pick<Location, "slug" | "name" | "address" | "status" | "visibility" | "summary" | "photos" | "card_colour">;

/* A photo band as the home page keeps it: removing the photo puts the
   website's own back. */
export const homeBand = (key: HomeBand, band: { image?: string; sticker?: string; stickerAlt?: string } | undefined): HomePhoto =>
  band?.image
    ? { image: band.image, sticker: band.sticker ?? "", stickerAlt: band.stickerAlt ?? "" }
    : HOME_PHOTOS[key];

/* The home page as a form, section by section in the order the page shows
   them: the live editor's "Form view", in its side panel. It edits the
   editor's own drafts (the page, the banner, the location cards), so the
   page beside it follows along and the editor's Save saves them. The FAQs
   are the exception, as everywhere: they save as each one changes.
   `onLeave` goes to another page of the admin, asking first if anything's
   unsaved. */
export default function HomeForm({
  home: f,
  setHome,
  banner,
  setBanner,
  locations,
  cards,
  setCard,
  visibilityFor,
  faqs,
  onNewUpload,
  onLeave,
}: {
  home: HomePage;
  setHome: (update: (old: HomePage) => HomePage) => void;
  banner: Banner;
  setBanner: (patch: Partial<Banner>) => void;
  locations: CardLocation[];
  cards: Record<string, CardDetails>;
  setCard: (slug: string, card: CardDetails) => void;
  // Each building's visibility, for its card (CardFields).
  visibilityFor: (slug: string) => { value: Visibility; onChange: (value: Visibility) => void };
  faqs: FaqRow[];
  onNewUpload: (url: string) => void;
  onLeave: (href: string) => void;
}) {
  const set = <S extends keyof HomePage>(section: S, patch: Partial<HomePage[S]>) =>
    setHome((old) => ({ ...old, [section]: { ...old[section], ...patch } }));
  const photo = (key: HomeBand) => (
    <div className="space-y-2 border-t border-ink/10 pt-6">
      <span className={labelClass}>Photo</span>
      <Band
        band={f.photos[key]}
        onChange={(band) => set("photos", { [key]: homeBand(key, band) })}
        onNewUpload={onNewUpload}
      />
      <p className="text-xs text-ink/50">Removing it puts the website&apos;s own photo back.</p>
    </div>
  );

  return (
    <FormSections
      sections={[
        {
          id: "banner",
          title: "Announcement banner",
          description: "The strip along the top of every page of the website.",
          content: <BannerFields banner={banner} onChange={setBanner} />,
        },
        {
          id: "hero",
          title: "Hero",
          description: "The first screen: the video, with the two-line title over it.",
          content: (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <Text label="Small line" hint="Uppercase, above the big word." value={f.hero.eyebrow} onChange={(v) => set("hero", { eyebrow: v })} />
                <Text label="Big word" hint="The large script line." value={f.hero.title} onChange={(v) => set("hero", { title: v })} />
              </div>
              <div className="space-y-1.5 border-t border-ink/10 pt-6">
                <span className={labelClass}>Background video</span>
                <VideoField value={f.hero.video} onChange={(v) => set("hero", { video: v })} folder="home" />
                <p className="text-xs text-ink/50">
                  An MP4, landscape, with no sound needed: it plays muted on a loop. Keep it short and under about
                  20 MB, since every visitor downloads it.
                </p>
              </div>
            </>
          ),
        },
        {
          id: "welcome",
          title: "Welcome",
          description: "The scrolling logos and the introduction under the hero.",
          content: (
            <>
              <Text
                label="Logo strip label"
                hint="The words that lead the row of logos. Leave empty to hide them."
                value={f.welcome.marquee}
                onChange={(v) => set("welcome", { marquee: v })}
              />
              <LogosList
                logos={f.welcome.logos}
                onChange={(logos) => set("welcome", { logos })}
                onAdd={(src) =>
                  setHome((old) => ({
                    ...old,
                    welcome: { ...old.welcome, logos: [...old.welcome.logos, { src, alt: "" }] },
                  }))
                }
              />
              <div className="grid gap-6 sm:grid-cols-2">
                <Text label="Small line" value={f.welcome.eyebrow} onChange={(v) => set("welcome", { eyebrow: v })} />
                <Text label="Big line" value={f.welcome.title} onChange={(v) => set("welcome", { title: v })} />
              </div>
              <Area label="Paragraph" rows={6} value={f.welcome.body} onChange={(v) => set("welcome", { body: v })} />
              <div className="grid gap-6 sm:grid-cols-2">
                <Text label="Link text" value={f.welcome.linkText} onChange={(v) => set("welcome", { linkText: v })} />
                <Text label="Link goes to" value={f.welcome.linkHref} onChange={(v) => set("welcome", { linkHref: v })} />
              </div>
            </>
          ),
        },
        {
          id: "perks",
          title: "Members' perks",
          description: "The green strip of five perks that fills with colour on scroll.",
          content: (
            <>
              <Text label="Label above" value={f.perks.label} onChange={(v) => set("perks", { label: v })} />
              <div className="space-y-2">
                <span className={labelClass}>The five perks</span>
                <p className="text-xs text-ink/50">Each perk is three short lines, stacked. Keep them to a word or two so they fit.</p>
                {f.perks.items.map((lines, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CountChip>{i + 1}</CountChip>
                    <div className="grid flex-1 gap-2 sm:grid-cols-3">
                      {lines.map((line, j) => (
                        <input
                          key={j}
                          value={line}
                          aria-label={`Perk ${i + 1}, line ${j + 1}`}
                          onChange={(e) =>
                            set("perks", {
                              items: f.perks.items.map((old, a) =>
                                a === i ? old.map((l, b) => (b === j ? e.target.value : l)) : old,
                              ),
                            })
                          }
                          className={inputClass}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ),
        },
        {
          id: "locations",
          title: "Locations",
          description: "The heading and intro over the carousel, and each building's card.",
          content: (
            <>
              <Text label="Heading" value={f.locations.title} onChange={(v) => set("locations", { title: v })} />
              <Area label="Intro" value={f.locations.intro} onChange={(v) => set("locations", { intro: v })} />
              <div className="space-y-3 border-t border-ink/10 pt-6">
                <span className={labelClass}>Cards</span>
                <p className="text-xs text-ink/50">
                  In the carousel&apos;s order, which is set under Buildings. Each is saved to its building, so it&apos;s
                  the same as its card details there.
                </p>
                {locations.map((l) => (
                  <div key={l.slug} className={`${subPanel} space-y-4`}>
                    <p className="text-sm font-medium text-ink">{buildingName({ slug: l.slug, name: cards[l.slug].name })}</p>
                    <CardFields
                      slug={l.slug}
                      value={cards[l.slug]}
                      onChange={(card) => setCard(l.slug, card)}
                      onNewUpload={onNewUpload}
                      visibility={visibilityFor(l.slug)}
                    />
                  </div>
                ))}
              </div>
            </>
          ),
        },
        {
          id: "neighbourhoods",
          title: "Photo under the locations",
          description: "The full-screen photo the location cards scroll away to uncover.",
          content: (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <Text label="Small line" hint="Leave empty to hide it." value={f.neighbourhoods.eyebrow} onChange={(v) => set("neighbourhoods", { eyebrow: v })} />
                <Text label="Big line" hint="Leave empty to hide it." value={f.neighbourhoods.title} onChange={(v) => set("neighbourhoods", { title: v })} />
              </div>
              {photo("neighbourhoods")}
            </>
          ),
        },
        {
          id: "highlights",
          title: "Highlights",
          description: "The pink section of ticket cards, with its two tabs, and the photo under it.",
          content: (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <Text label="Small line" value={f.highlights.eyebrow} onChange={(v) => set("highlights", { eyebrow: v })} />
                <Text label="Big line" value={f.highlights.title} onChange={(v) => set("highlights", { title: v })} />
              </div>
              <Area label="Intro" rows={4} value={f.highlights.intro} onChange={(v) => set("highlights", { intro: v })} />
              <div className="border-t border-ink/10 pt-6">
                <HighlightTabs highlights={f.highlights} onChange={(patch) => set("highlights", patch)} />
              </div>
              {photo("highlights")}
            </>
          ),
        },
        {
          id: "reader",
          title: "Volley Reader",
          description: "The article carousel's own wording, and the photo under it. The articles are under Volley Reader.",
          content: (
            <>
              <div className="grid gap-6 sm:grid-cols-3">
                <Text label="Heading" value={f.reader.title} onChange={(v) => set("reader", { title: v })} />
                <Text label="Link beside it" value={f.reader.link} onChange={(v) => set("reader", { link: v })} />
                <Text label="Link on each card" value={f.reader.cardLink} onChange={(v) => set("reader", { cardLink: v })} />
              </div>
              <button type="button" onClick={() => onLeave("/articles")} className={`${button.secondary} w-full`}>
                Edit the articles <ArrowRight className="size-4" />
              </button>
              {photo("reader")}
            </>
          ),
        },
        {
          id: "faqs",
          title: "FAQs",
          description: "The heading over the questions, and the questions themselves.",
          content: (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <Text label="Small line" value={f.faqs.eyebrow} onChange={(v) => set("faqs", { eyebrow: v })} />
                <Text label="Big line" value={f.faqs.title} onChange={(v) => set("faqs", { title: v })} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <Text label="Line under the heading" value={f.faqs.intro} onChange={(v) => set("faqs", { intro: v })} />
                <Text label="Handle at the bottom" value={f.faqs.handle} onChange={(v) => set("faqs", { handle: v })} />
              </div>
              <div className="border-t border-ink/10 pt-6">
                <FaqManager initial={faqs} />
              </div>
            </>
          ),
        },
        {
          id: "reviews",
          title: "Reviews",
          description: "Resident reviews, one at a time. With none, the section is left off the page.",
          content: (
            <>
              <Text label="Heading" value={f.reviews.title} onChange={(v) => set("reviews", { title: v })} />
              <ReviewsList items={f.reviews.items} onChange={(items) => set("reviews", { items })} />
            </>
          ),
        },
        {
          id: "beat",
          title: "Beat Average",
          description: "The two giant words. Also on every location page.",
          content: (
            <div className="grid gap-6 sm:grid-cols-2">
              <Text label="Script word" hint="The smaller one on top." value={f.beat.script} onChange={(v) => set("beat", { script: v })} />
              <Text label="Big word" hint="Shown in capitals. Keep it short: it's very large." value={f.beat.caps} onChange={(v) => set("beat", { caps: v })} />
            </div>
          ),
        },
        {
          id: "newsletter",
          title: "Newsletter",
          description: "The sign-up form. Also on every location page.",
          content: (
            <>
              <Text label="Heading" value={f.newsletter.title} onChange={(v) => set("newsletter", { title: v })} />
              <Text label="Line under it" value={f.newsletter.intro} onChange={(v) => set("newsletter", { intro: v })} />
              <Area label="Tick-box text" value={f.newsletter.consent} onChange={(v) => set("newsletter", { consent: v })} />
              <div className="grid gap-6 sm:grid-cols-2">
                <Text label="Button" value={f.newsletter.button} onChange={(v) => set("newsletter", { button: v })} />
                <Text label="Message after signing up" value={f.newsletter.done} onChange={(v) => set("newsletter", { done: v })} />
              </div>
            </>
          ),
        },
        {
          id: "dad",
          title: "Dad",
          description: "The closing photo, with a heading above it and a script line below. Also on every location page.",
          content: (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <Text label="Heading, line 1" value={f.dad.line1} onChange={(v) => set("dad", { line1: v })} />
                <Text label="Heading, line 2" value={f.dad.line2} onChange={(v) => set("dad", { line2: v })} />
              </div>
              <Text label="Script line under the photo" value={f.dad.script} onChange={(v) => set("dad", { script: v })} />
            </>
          ),
        },
      ]}
    />
  );
}
