"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { IdCard } from "lucide-react";
import { button, SaveButton } from "@/components/ui";
import { useToast } from "@/components/ToastProvider";
import { PdfField } from "@/components/Upload";
import { StringList } from "@/components/forms";
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
import { applyInlineEdit, LOCATION_NOT_INLINE, type FrameRect, type LocationField } from "@/lib/live-editor";
import { deleteUploads } from "@/lib/media-actions";
import { photoUrls } from "@/lib/photos";
import type { PreviewToken } from "@/lib/preview-token";
import { buildingName, type Visibility } from "@/lib/site";
import { SLOT_ASPECTS } from "@/lib/imageConstants";
import type { BuildingPhotos, Location } from "@/lib/types";
import { saveLocation } from "./actions";
import LocationForm from "./LocationForm";
import CardFields, { cardDetailsOf, withCardDetails } from "./CardFields";
import { Band, CommunityFields, FOLDER, readSize, Upload, withCommunity, type GalleryField } from "./PhotosEditor";
import PhotoGallery from "@/components/PhotoGallery";
import RoomTypesEditor from "./RoomTypesEditor";
import VisibilitySelect from "./VisibilitySelect";
import PlaceFields from "./PlaceFields";
import { emptyIncluded, IncludedIntro, IncludedListEditor } from "./IncludedEditor";
import { INCLUDED_LISTS } from "@/lib/included";

// The cards: the page's parts, its card in the carousel, and the form view with the rest.
type Card = LocationField | "card" | "form";
const CARDS: Record<Card, { title: string; hint?: string; panel?: boolean; size?: "lg" | "xl" }> = {
  slides: {
    title: "Slideshow",
    hint: "The photos at the top, in order. Click one to see it on the page, crop it or set what stays in view.",
    panel: true,
    size: "lg",
  },
  // Every photo's card opens as a panel, with room for the uploader.
  reveal: {
    title: "Photo under the intro",
    hint: "The full-screen photo the intro scrolls away to uncover, and its sticker.",
    panel: true,
    size: "lg",
  },
  community: {
    title: "Under the room types",
    hint: "The full-screen section the room types scroll away to uncover. Its two lines can also be typed straight onto the page.",
    panel: true,
    size: "lg",
  },
  map: { title: "Map", hint: "Shown whole: its labels are part of the photo, so it's never cropped.", panel: true, size: "lg" },
  neighbourhood: {
    title: 'Photo under "A (really) great Location"',
    hint: "The full-screen photo the write-up scrolls away to uncover, with the sticker in its corner.",
    panel: true,
    size: "lg",
  },
  gallery: {
    title: "Take a look around",
    hint: "The gallery carousel, in order. Click a photo to see it on the page, crop it or describe it.",
    panel: true,
    size: "lg",
  },
  dad: { title: "The res your dad wishes he went to", panel: true, size: "lg" },
  area: {
    title: "A (really) great Location",
    hint: "The paragraphs, in order; their wording can also be typed straight onto the page. With none, the section is hidden on the website.",
    panel: true,
    size: "lg",
  },
  rooms: {
    title: "Room types & availability",
    hint: "The wording can also be typed straight onto the page.",
    panel: true,
    size: "xl",
  },
  included: {
    title: "What's included",
    hint: "Click the pencil beside a list's heading on the page to edit its entries. A list with none is hidden on the website, and with all three empty, so is the section.",
    panel: true,
  },
  pricelist: { title: "Price list", hint: "The PDF the download button gives. Empty hides the button." },
  card: {
    title: "Card",
    hint: "This building's name, and its card in the Locations carousel, on the home page and under the other buildings. The same as clicking its card in the home page's editor.",
    panel: true,
  },
  form: {
    title: "Form view",
    hint: "The whole page in one place, a section at a time. It's the same draft as the page beside it: Save at the top saves it.",
    panel: true,
    size: "lg",
  },
};

/* A building's live editor, as the Bow + Arc CMS's project one: the real
   page (the website's /preview/location) in a frame, drawn from this
   draft. Its wording is typed straight onto it; a click on a photo, the
   room types or the download button opens that part's card. Its card in
   the carousel has a button of its own, and the form view (the rest) is a
   panel over the same draft. Nothing
   reaches the database until Save. */
export default function BuildingLiveEditor({
  initial,
  icons,
  preview,
}: {
  initial: Location;
  // The icons a "What's included" item can have (the site's own).
  icons: string[];
  preview: PreviewToken;
}) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  // Whether it's on the website: saved on its own, the moment it's picked
  // (VisibilitySelect), so it's no part of the draft.
  const [visibility, setVisibility] = useState<Visibility>(initial.visibility ?? "auto");
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const name = buildingName(draft);

  const [device, setDevice] = useState<Device>("desktop");
  const [active, setActive] = useState<Card | null>(null);
  // Which of a part that repeats: the "What's included" list clicked.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<FrameRect | null>(null);
  const [frameBox, setFrameBox] = useState<Box | null>(null);
  const activeRef = useRef<Card | null>(null);
  const inBrowser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const set = (patch: Partial<Location>) => setDraft((old) => ({ ...old, ...patch }));
  const photos: BuildingPhotos = draft.photos ?? {};
  const setPhoto = <K extends keyof BuildingPhotos>(slot: K, value: BuildingPhotos[K]) =>
    set({ photos: { ...photos, [slot]: value } });

  /* Uploads made here: any the building doesn't use when the editor is
     left are deleted then (those a save replaces, the save deletes), and
     one that only finishes after that, straight away. A closed tab skips
     all this: lib/media-sweep.ts catches those. */
  const uploads = useRef<string[]>([]);
  const left = useRef(false);
  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);
  /* Back to false on every mount: React's development check closes and
     reopens the editor once, and a flag left true then would delete every
     upload as it landed. */
  useEffect(() => {
    left.current = false;
    return () => {
      left.current = true;
      const s = savedRef.current;
      const kept = new Set([...photoUrls(s.photos), ...(s.rooms?.types.flatMap((t) => t.images.map((i) => i.src)) ?? [])]);
      const abandoned = uploads.current.filter((url) => !kept.has(url));
      if (abandoned.length) void deleteUploads(abandoned);
    };
  }, []);
  const onNewUpload = (url: string) => {
    if (left.current) void deleteUploads([url]);
    else uploads.current.push(url);
  };

  /* The photo open in a gallery's grid (the slideshow, "Take a look
     around"): the page beside it turns that carousel to it. */
  const [photoFocus, setPhotoFocus] = useState<{ field: GalleryField; index: number } | null>(null);
  const focusPhoto = useCallback(
    (field: GalleryField, index: number | null) =>
      setPhotoFocus((old) => (index === null ? (old?.field === field ? null : old) : { field, index })),
    [],
  );

  // The part marked on the page: the open card's, or in the form view the
  // gallery with a photo open, if any.
  const highlightField = active === "form" ? (photoFocus?.field ?? null) : active === "card" ? null : active;
  const { iframeRef, previewUrl, previewError } = usePreviewFrame({
    page: "location",
    query: `&slug=${encodeURIComponent(initial.slug)}`,
    preview,
    draft,
    highlight: highlightField,
    highlightIndex: activeIndex,
    // Only to the gallery it's open in.
    highlightPhoto: photoFocus && photoFocus.field === highlightField ? photoFocus.index : null,
    onMessage: (message) => {
      if (message.type === "select") openCard(message.field, message.rect, message.index ?? null);
      else if (message.type === "rect") {
        // Its place, reported as the page scrolls: the same card, kept on the same list.
        if (message.field === activeRef.current) openCard(message.field, message.rect, message.index ?? null);
      } else if (message.type === "edit")
        setDraft((old) =>
          // The name typed on the hero, or the sticker's word: written even
          // while it's still the website's own (null here). Emptied, it
          // goes back to that.
          message.key === "name" || message.key === "beds_word"
            ? { ...old, [message.key]: message.value.trim() ? message.value : null }
            : message.key === "community.eyebrow" || message.key === "community.title"
              ? // The lines over the section under the room types: written
                // even while it still shows the website's own.
                {
                  ...old,
                  photos: {
                    ...old.photos,
                    community: withCommunity(old.photos?.community, {
                      [message.key === "community.eyebrow" ? "eyebrow" : "title"]: message.value,
                    }),
                  },
                }
              : applyInlineEdit(old, message.key, message.value, LOCATION_NOT_INLINE),
        );
    },
  });

  const openCard = useCallback(
    (card: Card | null, rect: FrameRect | null = null, index: number | null = null) => {
      setActive(card);
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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
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

  // Unsaved changes kept on this device.
  useDraftBackup(`building:${initial.slug}`, draft, saved, setDraft);
  useLeaveGuard(dirty);
  const leave = async (href: string) => {
    if (!(await confirmNavigation())) return;
    startNavigationProgress(href);
    router.push(href);
  };

  // Saves the draft.
  const save = (location: Location = draft) =>
    start(async () => {
      try {
        const result = await saveLocation(location);
        toast.result(result);
        if (!result.ok) return;
        setDraft(location);
        setSaved(location);
      } catch (err) {
        toast.error("Not saved", (err as Error).message);
      }
    });
  // Save waits out a lost connection.
  const saveOnline = useSaveWhenOnline(() => save());

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

  const cardBody = (card: Card): ReactNode => {
    switch (card) {
      case "slides":
        return (
          <PhotoGallery
            photos={photos.slides ?? []}
            onChange={(slides) => setPhoto("slides", slides)}
            preset="slide"
            focal="slide"
            folder={FOLDER}
            firstLabel="Shows first"
            onNewUpload={onNewUpload}
            onFocusPhoto={(i) => focusPhoto("slides", i)}
          />
        );
      case "reveal":
      case "neighbourhood":
        return <Band band={photos[card]} onChange={(band) => setPhoto(card, band)} onNewUpload={onNewUpload} />;
      case "community":
        return (
          <CommunityFields
            community={photos.community}
            onChange={(community) => setPhoto("community", community)}
            onNewUpload={onNewUpload}
          />
        );
      case "map":
        return (
          <>
            <Upload
              value={photos.map?.image}
              onChange={async (image) => {
                if (!image) return setPhoto("map", undefined);
                const size = await readSize(image);
                setPhoto("map", { alt: photos.map?.alt ?? "", image, width: size?.width ?? 0, height: size?.height ?? 0 });
              }}
              preset="map"
              aspect={SLOT_ASPECTS.map}
              onNewUpload={onNewUpload}
            />
          </>
        );
      case "gallery":
        return (
          <PhotoGallery
            photos={photos.gallery ?? []}
            onChange={(gallery) => setPhoto("gallery", gallery)}
            preset="gallery"
            folder={FOLDER}
            firstLabel="Shows first"
            onNewUpload={onNewUpload}
            onFocusPhoto={(i) => focusPhoto("gallery", i)}
          />
        );
      case "dad":
        return (
          <>
            <Upload
              value={photos.dad?.image}
              onChange={(image) => setPhoto("dad", image ? { alt: photos.dad?.alt ?? "", image } : undefined)}
              preset="feature"
              aspect={SLOT_ASPECTS.feature}
              onNewUpload={onNewUpload}
            />
          </>
        );
      case "rooms":
        return <RoomTypesEditor rooms={draft.rooms} setRooms={(rooms) => set({ rooms })} onNewUpload={onNewUpload} />;
      case "area":
        return (
          <StringList
            multiline
            values={draft.area?.paragraphs ?? []}
            onChange={(paragraphs) => set({ area: { paragraphs } })}
            addLabel="Add a paragraph"
          />
        );
      case "included": {
        const included = draft.included ?? emptyIncluded();
        const list = activeIndex === null ? undefined : INCLUDED_LISTS[activeIndex];
        // The pencil beside a list's heading: that list's entries.
        if (list)
          return (
            <IncludedListEditor
              items={included[list[0]]}
              onChange={(items) => set({ included: { ...included, [list[0]]: items } })}
              icons={icons}
            />
          );
        return (
          <>
            <IncludedIntro included={included} onChange={(next) => set({ included: next })} />
            <div className="space-y-1">
              {INCLUDED_LISTS.map(([key, title], i) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => openCard("included", anchor, i)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink transition-colors hover:bg-bone/50"
                >
                  {title}
                  <span className="text-xs text-ink/45">{included[key].length || "No"} entries</span>
                </button>
              ))}
            </div>
          </>
        );
      }
      case "pricelist":
        return <PdfField value={draft.pricelist ?? ""} onChange={(pricelist) => set({ pricelist })} folder="pricelists" />;
      case "card":
        return (
          <div className="space-y-5">
            <CardFields
              slug={draft.slug}
              value={cardDetailsOf(draft)}
              onChange={(card) => setDraft((old) => withCardDetails(old, card))}
              onNewUpload={onNewUpload}
              visibility={{ value: visibility, onChange: setVisibility }}
            />
            <PlaceFields location={draft} onChange={(patch) => set(patch)} />
          </div>
        );
      case "form":
        return (
          <LocationForm
            location={draft}
            onChange={setDraft}
            icons={icons}
            onNewUpload={onNewUpload}
            onFocusPhoto={focusPhoto}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-45 flex flex-col bg-bone">
      <EditorHeader
        back={{ label: "Buildings", onClick: () => leave("/buildings") }}
        title={name}
        dirty={dirty}
        device={device}
        onDevice={(next) => {
          openCard(null);
          setDevice(next);
        }}
        viewUrl={siteUrl ? `${siteUrl}/locations/${draft.slug}` : null}
        formOpen={active === "form"}
        onForm={() => openCard(active === "form" ? null : "form")}
        formTitle="Every part of the building's page as a form"
        actions={
          <>
            <VisibilitySelect slug={initial.slug} value={visibility} status={draft.status} onChange={setVisibility} />
            <button
              type="button"
              onClick={() => openCard(active === "card" ? null : "card")}
              aria-pressed={active === "card"}
              title="Its card in the Locations carousel"
              className={`${button.secondary} py-2! ${active === "card" ? "border-ink/50!" : ""}`}
            >
              <IdCard className="size-4" /> <span className="hidden md:inline">Card</span>
            </button>
          </>
        }
        save={<SaveButton dirty={dirty} pending={pending} waiting={saveOnline.waiting} label="Save" onClick={saveOnline.save} />}
      />

      <PreviewCanvas
        iframeRef={iframeRef}
        previewUrl={previewUrl}
        previewError={previewError}
        device={device}
        title={`Live preview of ${name}`}
        onBackgroundClick={() => openCard(null)}
      />

      {active && inBrowser && (
        <FieldCard
          key={`${active}:${activeIndex}`}
          // A "What's included" list's dialog is called by its heading.
          title={active === "included" && activeIndex !== null ? INCLUDED_LISTS[activeIndex][1] : CARDS[active].title}
          hint={
            active === "included" && activeIndex !== null
              ? "In the order they show on the page, down each column in turn. Drag them by their grips to reorder. With none, this list is hidden on the website."
              : CARDS[active].hint
          }
          panel={CARDS[active].panel}
          size={CARDS[active].size}
          onBack={
            active === "included" && activeIndex !== null
              ? { label: "All lists", onClick: () => openCard("included", anchor, null) }
              : undefined
          }
          position={cardPosition(anchor, frameBox)}
          onClose={() => openCard(null)}
        >
          {cardBody(active)}
        </FieldCard>
      )}
    </div>
  );
}
