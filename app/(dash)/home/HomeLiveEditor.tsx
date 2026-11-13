"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Badge, button, SaveButton } from "@/components/ui";
import { useSettingsForm } from "@/components/forms";
import { useToast } from "@/components/ToastProvider";
import { VideoField } from "@/components/Upload";
import {
  cardPosition,
  EditorHeader,
  FieldCard,
  PreviewCanvas,
  usePreviewFrame,
  type Box,
  type Device,
} from "@/components/live-editor/editorShell";
import { confirmNavigation, useLeaveGuard } from "@/lib/navigation-guard";
import { startNavigationProgress } from "@/lib/navigation-progress";
import { useDraftBackup, useSaveWhenOnline } from "@/lib/offline";
import { applyInlineEdit, HOME_NOT_INLINE, type FrameRect, type HomeField } from "@/lib/live-editor";
import type { PreviewToken } from "@/lib/preview-token";
import { deleteUploads } from "@/lib/media-actions";
import { cardPhoto } from "@/lib/photos";
import { buildingName, type Visibility } from "@/lib/site";
import type { Banner, FaqRow, HomeBand, HomePage, Location } from "@/lib/types";
import { saveBuildingCard } from "../buildings/actions";
import CardFields, { cardDetailsOf, type CardDetails } from "../buildings/CardFields";
import { Band } from "../buildings/PhotosEditor";
import { saveHome } from "./actions";
import { saveBanner } from "./banner-actions";
import FaqManager from "./FaqManager";
import { BannerFields, HighlightTabs, LogosList, ReviewsList, Text } from "./fields";
import HomeForm, { homeBand } from "./HomeForm";

type CardLocation = Pick<Location, "slug" | "name" | "address" | "status" | "visibility" | "summary" | "photos" | "card_colour">;

// Each card's heading, the line under it, and whether it opens as a dialog.
// The cards: the page's parts, and the form view with all of it.
type Card = HomeField | "form";
const CARDS: Record<Card, { title: string; hint?: string; panel?: boolean; size?: "lg" | "xl" }> = {
  form: {
    title: "Form view",
    hint: "The whole home page in one place, section by section. It's the same draft as the page beside it: Save at the top saves it (the FAQs save as each one changes).",
    panel: true,
    size: "lg",
  },
  banner: {
    title: "Announcement banner",
    hint: "The strip along the top of every page of the website. It saves with the rest of the page.",
  },
  "hero.video": {
    title: "Hero video",
    hint: "An MP4, landscape, with no sound needed: it plays muted on a loop. Keep it short and under about 20 MB, since every visitor downloads it.",
  },
  "welcome.logos": { title: "Scrolling logos", panel: true },
  "welcome.link": { title: "Welcome link" },
  "locations.cards": {
    title: "Building card",
    hint: "Saved to its building, so it's the same as the card details under Buildings. The name and bed count are fixed; the order is set under Buildings.",
    panel: true,
  },
  "highlights.cards": {
    title: "Highlight cards",
    hint: "The wording can also be typed straight onto the cards. Add, remove and reorder them here.",
    panel: true,
    size: "lg",
  },
  "reader.articles": {
    title: "Volley Reader",
    hint: "The articles in this carousel are written under Volley Reader.",
  },
  "faqs.list": {
    title: "Frequently asked questions",
    hint: "Add, edit, delete and reorder the questions; each shows on the page once it's saved. The heading above them is typed onto the page itself.",
    panel: true,
    size: "xl",
  },
  "photos.neighbourhoods": {
    title: "Photo under the locations",
    hint: "The full-screen photo the location cards scroll away to uncover. Its wording is typed straight onto the page. Removing it puts the website's own back.",
    panel: true,
    size: "lg",
  },
  "photos.highlights": {
    title: "Photo under the highlights",
    hint: "The full-screen photo the highlights scroll away to uncover, and the sticker on it. Removing the photo puts the website's own back.",
    panel: true,
    size: "lg",
  },
  "photos.reader": {
    title: "Photo under the Volley Reader",
    hint: "The full-screen photo the Volley Reader scrolls away to uncover, and the sticker on it. Removing the photo puts the website's own back.",
    panel: true,
    size: "lg",
  },
  "reviews.items": {
    title: "Reviews",
    hint: "The heading and the resident reviews, in the order the arrows go through them. With none, the section is left off the page.",
    panel: true,
    size: "lg",
  },
};

/* The home page's live editor, as in the Bow + Arc CMS: the real home page
   (the website's /preview/home) in a frame, drawn from this draft. Wording
   is typed straight onto it; a click on anything else opens that part's
   card on top of it. Nothing reaches the database until Save, which writes
   the page, the banner and any changed location cards. The form view
   (HomeForm.tsx) is a panel over the same drafts. */
export default function HomeLiveEditor({
  initial,
  banner: initialBanner,
  locations,
  faqs,
  preview,
  open = null,
}: {
  initial: HomePage;
  banner: Banner;
  locations: CardLocation[];
  faqs: FaqRow[];
  // The preview frame's token, or why there isn't one.
  preview: PreviewToken;
  // A card to start with open, e.g. from the dashboard's FAQs link.
  open?: Card | null;
}) {
  const router = useRouter();
  const page = useSettingsForm(initial, saveHome);
  const { value: home, setValue } = page;
  // The banner is a setting of its own, edited and saved alongside the page.
  const bannerForm = useSettingsForm(initialBanner, saveBanner);
  const banner = bannerForm.value;
  /* The location cards: each is its building's, so each changed one is
     saved to that building, and only its card details. */
  const toast = useToast();
  const initialCards = () => Object.fromEntries(locations.map((l) => [l.slug, cardDetailsOf(l)]));
  const [cards, setCards] = useState<Record<string, CardDetails>>(initialCards);
  const [savedCards, setSavedCards] = useState<Record<string, CardDetails>>(initialCards);
  // Each building's visibility: saved on its own as it's picked (VisibilitySelect).
  const [visibilities, setVisibilities] = useState<Record<string, Visibility>>(() =>
    Object.fromEntries(locations.map((l) => [l.slug, l.visibility ?? "auto"])),
  );
  const visibilityFor = (slug: string) => ({
    value: visibilities[slug] ?? "auto",
    onChange: (value: Visibility) => setVisibilities((old) => ({ ...old, [slug]: value })),
  });
  const [cardsPending, startCards] = useTransition();
  const changedCards = locations.filter((l) => JSON.stringify(cards[l.slug]) !== JSON.stringify(savedCards[l.slug]));
  const saveCards = () =>
    startCards(async () => {
      for (const l of changedCards) {
        const card = cards[l.slug];
        try {
          const result = await saveBuildingCard(l.slug, card);
          toast.result(result, `${buildingName({ slug: l.slug, name: card.name })} card`);
          if (result.ok) setSavedCards((old) => ({ ...old, [l.slug]: card }));
        } catch (err) {
          toast.error("Not saved", (err as Error).message);
        }
      }
    });

  /* Photos uploaded here (card photos, and the page's own): any that end
     up unsaved are deleted when the editor is left (one a save replaces,
     the save deletes), and one that only finishes after that, straight
     away. A closed tab skips all this: lib/media-sweep.ts catches those. */
  const uploads = useRef<string[]>([]);
  const left = useRef(false);
  const onNewUpload = (url: string) => {
    if (left.current) void deleteUploads([url]);
    else uploads.current.push(url);
  };
  const savedCardsRef = useRef(savedCards);
  const savedPhotosRef = useRef(home.photos);
  useEffect(() => {
    savedCardsRef.current = savedCards;
  }, [savedCards]);
  useEffect(() => {
    if (!page.dirty) savedPhotosRef.current = home.photos;
  }, [page.dirty, home.photos]);
  /* Back to false on every mount: React's development check closes and
     reopens the editor once, and a flag left true then would delete every
     upload as it landed. */
  useEffect(() => {
    left.current = false;
    return () => {
      left.current = true;
      const kept = new Set([
        ...Object.values(savedCardsRef.current).map((c) => c.photo),
        ...Object.values(savedPhotosRef.current).flatMap((b) => [b.image, b.sticker]),
      ]);
      const abandoned = uploads.current.filter((url) => !kept.has(url));
      if (abandoned.length) void deleteUploads(abandoned);
    };
  }, []);

  const dirty = page.dirty || bannerForm.dirty || changedCards.length > 0;
  const pending = page.pending || bannerForm.pending || cardsPending;
  const save = () => {
    if (page.dirty) page.save();
    if (bannerForm.dirty) bannerForm.save();
    if (changedCards.length) saveCards();
  };
  const draft = useMemo(
    () => ({
      ...home,
      banner,
      // Drawn over the saved cards, so the page shows them as they're edited.
      cards: locations.map((l) => {
        const card = cards[l.slug];
        return {
          slug: l.slug,
          name: card.name ?? "",
          status: card.status,
          address: card.address,
          summary: card.summary,
          image: cardPhoto(l.slug, { ...l.photos, card: card.photo || undefined }) ?? "",
          nameColour: card.nameColour ?? "",
        };
      }),
    }),
    [home, banner, cards, locations],
  );
  const [device, setDevice] = useState<Device>("desktop");
  const [active, setActive] = useState<Card | null>(open);
  // Which of a part that repeats: the location card clicked.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Where the active part is in the frame, and where the frame is.
  const [anchor, setAnchor] = useState<FrameRect | null>(null);
  const [frameBox, setFrameBox] = useState<Box | null>(null);
  const activeRef = useRef<Card | null>(null);
  /* Cards are drawn in the browser only: where one floats depends on the
     window, which the server can't know (a card can be open from the
     start, by ?open=). */
  const inBrowser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const set = <S extends keyof HomePage>(section: S, patch: Partial<HomePage[S]>) =>
    setValue((old) => ({ ...old, [section]: { ...old[section], ...patch } }));

  const { iframeRef, previewUrl, previewError } = usePreviewFrame({
    page: "home",
    preview,
    draft,
    highlight: active === "form" ? null : active,
    highlightIndex: activeIndex,
    onMessage: (message) => {
      if (message.type === "select") openCard(message.field, message.rect, message.index ?? null);
      else if (message.type === "rect") {
        // Its place, reported as the page scrolls: the same card, kept on the same one.
        if (message.field === activeRef.current) openCard(message.field, message.rect, message.index ?? null);
      } else if (message.type === "edit")
        setValue((old) => applyInlineEdit(old, message.key, message.value, HOME_NOT_INLINE));
    },
  });

  const openCard = useCallback(
    (field: Card | null, rect: FrameRect | null = null, index: number | null = null) => {
      setActive(field);
      setActiveIndex(index);
      setAnchor(rect);
      const box = iframeRef.current?.getBoundingClientRect();
      setFrameBox(box ? { left: box.left, top: box.top, width: box.width, height: box.height } : null);
    },
    [iframeRef],
  );

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // The editor covers the admin; the page underneath stays put.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  /* Esc closes the card. So does resizing the window, which moves the part
     it sits on (the next click reopens it in the right place). */
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // A confirmation opened from the card closes itself first.
      if (document.querySelector('[aria-modal="true"]')) return;
      openCard(null);
    };
    const onResize = () => openCard(null);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [active, openCard]);

  /* Unsaved changes (the page, the banner and the cards, together) kept on
     this device; Save waits out a lost connection. */
  useDraftBackup(
    "home",
    { home, banner, cards },
    { home: page.saved, banner: bannerForm.saved, cards: savedCards },
    (kept) => {
      setValue(kept.home);
      bannerForm.setValue(kept.banner);
      setCards(kept.cards);
    },
  );
  const saveOnline = useSaveWhenOnline(save);
  useLeaveGuard(dirty);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const leave = async (href: string) => {
    if (!(await confirmNavigation())) return;
    startNavigationProgress(href);
    router.push(href);
  };

  // A card whose content lives on another page of the admin.
  const elsewhere = (label: string, href: string) => (
    <button type="button" onClick={() => leave(href)} className={`${button.secondary} w-full`}>
      {label} <ArrowRight className="size-4" />
    </button>
  );

  const cardBody = (field: Card): ReactNode => {
    switch (field) {
      case "form":
        return (
          <HomeForm
            home={home}
            setHome={setValue}
            banner={banner}
            setBanner={(patch) => bannerForm.setValue((old) => ({ ...old, ...patch }))}
            locations={locations}
            cards={cards}
            setCard={(slug, card) => setCards((old) => ({ ...old, [slug]: card }))}
            visibilityFor={visibilityFor}
            faqs={faqs}
            onNewUpload={onNewUpload}
            onLeave={leave}
          />
        );
      case "banner":
        return (
          <BannerFields
            banner={banner}
            onChange={(patch) => bannerForm.setValue((old) => ({ ...old, ...patch }))}
          />
        );
      case "hero.video":
        return <VideoField value={home.hero.video} onChange={(video) => set("hero", { video })} folder="home" />;
      case "welcome.logos":
        return (
          <>
            <Text
              label="Label"
              hint="The words that lead the row. Leave empty to hide them."
              value={home.welcome.marquee}
              onChange={(marquee) => set("welcome", { marquee })}
            />
            <LogosList
              logos={home.welcome.logos}
              onChange={(logos) => set("welcome", { logos })}
              onAdd={(src) =>
                setValue((old) => ({
                  ...old,
                  welcome: { ...old.welcome, logos: [...old.welcome.logos, { src, alt: "" }] },
                }))
              }
            />
          </>
        );
      case "welcome.link":
        return (
          <>
            <Text label="Link text" value={home.welcome.linkText} onChange={(linkText) => set("welcome", { linkText })} />
            <Text label="Link goes to" value={home.welcome.linkHref} onChange={(linkHref) => set("welcome", { linkHref })} />
          </>
        );
      case "locations.cards": {
        const l = activeIndex === null ? undefined : locations[activeIndex];
        // A card clicked: its details. (Otherwise, the list of them.)
        if (l)
          return (
            <>
              <p className="text-sm font-medium text-ink">{buildingName({ slug: l.slug, name: cards[l.slug].name })}</p>
              <CardFields
                slug={l.slug}
                value={cards[l.slug]}
                onChange={(card) => setCards((old) => ({ ...old, [l.slug]: card }))}
                onNewUpload={onNewUpload}
                visibility={visibilityFor(l.slug)}
              />
              {elsewhere("Edit the whole building", `/buildings/${l.slug}`)}
            </>
          );
        return (
          <ul className="space-y-1">
            {locations.map((l) => (
              <li key={l.slug}>
                <button
                  type="button"
                  onClick={() => leave(`/buildings/${l.slug}`)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-bone/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{buildingName({ slug: l.slug, name: cards[l.slug].name })}</span>
                    <span className="block truncate text-xs text-ink/50">{cards[l.slug].address || "No address set"}</span>
                  </span>
                  <Badge tone={cards[l.slug].status === "Open" ? "lemon" : "yellow"}>{cards[l.slug].status}</Badge>
                  <ArrowRight className="size-4 shrink-0 text-ink/40" />
                </button>
              </li>
            ))}
          </ul>
        );
      }
      case "highlights.cards":
        return <HighlightTabs highlights={home.highlights} onChange={(patch) => set("highlights", patch)} />;
      case "reader.articles":
        return (
          <>
            <Text
              label="Link on each card"
              value={home.reader.cardLink}
              onChange={(cardLink) => set("reader", { cardLink })}
            />
            {elsewhere("Edit the articles", "/articles")}
          </>
        );
      case "faqs.list":
        return <FaqManager initial={faqs} />;
      case "photos.neighbourhoods":
      case "photos.highlights":
      case "photos.reader": {
        const key = field.slice("photos.".length) as HomeBand;
        const photo = home.photos[key];
        return (
          <Band
            band={photo}
            onChange={(band) => set("photos", { [key]: homeBand(key, band) })}
            onNewUpload={onNewUpload}
          />
        );
      }
      case "reviews.items":
        return (
          <>
            <Text label="Heading" value={home.reviews.title} onChange={(title) => set("reviews", { title })} />
            <ReviewsList items={home.reviews.items} onChange={(items) => set("reviews", { items })} />
          </>
        );
    }
  };

  return (
    // Above the frame's top bar, below the sidebar, which floats over the
    // page here as it does everywhere.
    <div className="fixed inset-0 z-45 flex flex-col bg-bone">
      <EditorHeader
        back={{ label: "Dashboard", onClick: () => leave("/") }}
        title="Home page"
        dirty={dirty}
        device={device}
        onDevice={(next) => {
          openCard(null);
          setDevice(next);
        }}
        viewUrl={siteUrl || null}
        formOpen={active === "form"}
        onForm={() => openCard(active === "form" ? null : "form")}
        formTitle="Every section of the home page as a form"
        save={<SaveButton dirty={dirty} pending={pending} waiting={saveOnline.waiting} label="Save" onClick={saveOnline.save} />}
      />

      <PreviewCanvas
        iframeRef={iframeRef}
        previewUrl={previewUrl}
        previewError={previewError}
        device={device}
        title="Live preview of the home page"
        onBackgroundClick={() => openCard(null)}
      />

      {active && inBrowser && (
        <FieldCard
          key={`${active}:${activeIndex}`}
          title={CARDS[active].title}
          hint={CARDS[active].hint}
          panel={CARDS[active].panel}
          size={CARDS[active].size}
          position={cardPosition(anchor, frameBox)}
          onClose={() => openCard(null)}
        >
          {cardBody(active)}
        </FieldCard>
      )}
    </div>
  );
}
