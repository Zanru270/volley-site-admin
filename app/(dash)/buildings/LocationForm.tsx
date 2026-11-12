"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { button, inputClass, labelClass, Toggle } from "@/components/ui";
import { RowControls, StringList } from "@/components/forms";
import FormSections, { type FormSection } from "@/components/FormSections";
import Sortable from "@/components/Sortable";
import { PdfField } from "@/components/Upload";
import { LOCATION_CARDS, PAGE_SECTIONS, type PageSection } from "@/lib/site";
import type { Location } from "@/lib/types";
import { PhotoSlot, type GalleryField, type PhotoSlotKey } from "./PhotosEditor";
import PlaceFields from "./PlaceFields";
import RoomTypesEditor from "./RoomTypesEditor";
import IncludedEditor from "./IncludedEditor";

// The description is edited as paragraphs whether it was saved as one string or several.
const paragraphs = (d: Location["description"]): string[] => (Array.isArray(d) ? d : d ? [d] : []);

/* A building's page as a form, section by section in page order, each with
   its on/off switch (sections, in lib/site.ts PAGE_SECTIONS) and its photos
   in it: the live editor's "Form view", in its side panel. Its card in the carousel isn't here: that has
   its own button in the editor. It edits the editor's own draft, so the page
   beside it follows along and the editor's Save saves it. `onNewUpload`
   hears of every upload, so the editor can clear away the ones it doesn't
   end up saving. */
export default function LocationForm({
  location: loc,
  onChange,
  icons,
  onNewUpload,
  onFocusPhoto,
}: {
  location: Location;
  onChange: (update: (old: Location) => Location) => void;
  icons: string[];
  onNewUpload: (url: string) => void;
  onFocusPhoto?: (field: GalleryField, index: number | null) => void;
}) {
  const set = <K extends keyof Location>(key: K, value: Location[K]) => onChange((l) => ({ ...l, [key]: value }));
  const stats = loc.stats ?? [];
  // Each section shows unless switched off; only the ones off are kept.
  const sectionOn = (key: PageSection) => loc.sections?.[key] !== false;
  const setSection = (key: PageSection, on: boolean) => {
    const next = { ...loc.sections };
    if (on) delete next[key];
    else next[key] = false;
    set("sections", Object.keys(next).length ? next : null);
  };
  // One section of the page: its switch in the header, its fields inside.
  const section = (key: PageSection, description: string, content: ReactNode): FormSection => {
    const info = PAGE_SECTIONS.find((p) => p.key === key)!;
    return {
      id: key,
      title: info.label,
      description: "needs" in info ? `${description} Shows on the website once it has ${info.needs}.` : description,
      content,
      toggle: { on: sectionOn(key), onChange: (on) => setSection(key, on) },
    };
  };
  // A photo slot of the page, in the section it belongs to.
  const photo = (slot: PhotoSlotKey) => (
    <PhotoSlot
      slot={slot}
      photos={loc.photos ?? {}}
      onChange={(photos) => set("photos", photos)}
      onNewUpload={onNewUpload}
      onFocusPhoto={onFocusPhoto}
    />
  );
  // The sections whose wording is the home page's.
  const fromHome = (
    <p className="text-sm text-ink/60">
      Its wording is the home page&rsquo;s: edit it in the home page&rsquo;s editor.
    </p>
  );
  // Each intro button shows unless switched off.
  const showButton = (key: "pricelist" | "tour") => loc.buttons?.[key] !== false;
  const setButton = (key: "pricelist" | "tour", on: boolean) =>
    set("buttons", {
      pricelist: showButton("pricelist"),
      tour: showButton("tour"),
      [key]: on,
    });

  return (
    <FormSections
      sections={[
        {
          id: "top",
          title: "Top of the page",
          description:
            "The slideshow and the bedrooms sticker on it (its number and word). The name is edited by clicking the title on the page, or with Card.",
          content: (
            <>
              <div className="space-y-2">
                <span className={labelClass}>Slideshow</span>
                <p className="text-xs text-ink/50">
                  Each photo gets a focal point that stays in view on desktop and phone.
                </p>
                {photo("slides")}
              </div>
              <label className="block space-y-2">
                <span className={labelClass}>Bedrooms</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={loc.beds ?? ""}
                  onChange={(e) =>
                    set("beds", e.target.value === "" ? null : Math.max(1, Math.round(Number(e.target.value))))
                  }
                  placeholder={LOCATION_CARDS[loc.slug] ? String(LOCATION_CARDS[loc.slug].beds) : "e.g. 140"}
                  className={`${inputClass} max-w-32`}
                />
                <span className="block text-xs text-ink/50">
                  Shown as &ldquo;140 amazing bedrooms available&rdquo;, and on its card. Leave empty to keep the
                  website&rsquo;s number.
                </span>
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Word beside the number</span>
                <input
                  value={loc.beds_word ?? ""}
                  onChange={(e) => set("beds_word", e.target.value || null)}
                  maxLength={30}
                  placeholder="amazing"
                  className={`${inputClass} max-w-60`}
                />
                <span className="block text-xs text-ink/50">
                  &ldquo;140 <em>amazing</em> bedrooms available&rdquo;, e.g. design-led. It can also be typed straight
                  onto the sticker. Leave empty for &ldquo;amazing&rdquo;.
                </span>
              </label>
            </>
          ),
        },
        {
          id: "intro",
          title: "Intro",
          description:
            "The building's city and colour, the description under the photos at the top, its headline figures, the price list, and which buttons show.",
          content: (
            <>
              <PlaceFields location={loc} onChange={(patch) => onChange((old) => ({ ...old, ...patch }))} />
              <div className="space-y-2">
                <span className={labelClass}>Description</span>
                <StringList
                  multiline
                  values={paragraphs(loc.description)}
                  onChange={(d) => set("description", d)}
                  addLabel="Add a paragraph"
                />
              </div>
              <div className="space-y-2">
                <span className={labelClass}>Headline figures</span>
                <p className="text-xs text-ink/50">Up to two, in the row under the intro.</p>
                <Sortable
                  items={stats}
                  onChange={(next) => set("stats", next)}
                  className="space-y-3"
                  itemClassName="flex items-start gap-3 rounded-lg"
                >
                  {(s, sort) => {
                    const i = sort.index;
                    const setStat = (patch: Partial<(typeof stats)[number]>) =>
                      set(
                        "stats",
                        stats.map((o, j) => (j === i ? { ...o, ...patch } : o)),
                      );
                    return (
                      <>
                        <input
                          value={s.label}
                          onChange={(e) => setStat({ label: e.target.value })}
                          placeholder="Label, e.g. Rentals / student start at:"
                          className={inputClass}
                        />
                        <input
                          value={s.value}
                          onChange={(e) => setStat({ value: e.target.value })}
                          placeholder="Figure, e.g. R8,790/ month"
                          className={`${inputClass} sm:max-w-48`}
                        />
                        <RowControls {...sort.row} onRemove={sort.remove} />
                      </>
                    );
                  }}
                </Sortable>
                {stats.length < 2 && (
                  <button
                    type="button"
                    onClick={() => set("stats", [...stats, { label: "", value: "" }])}
                    className={button.ghost}
                  >
                    <Plus className="size-4" /> Add a figure
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <span className={labelClass}>Price list</span>
                <PdfField value={loc.pricelist ?? ""} onChange={(v) => set("pricelist", v)} folder="pricelists" />
                <p className="text-xs text-ink/50">The download button. Leave empty for no button.</p>
              </div>
              <div className="space-y-4">
                <span className={labelClass}>Buttons</span>
                <Toggle
                  checked={showButton("pricelist")}
                  onChange={(on) => setButton("pricelist", on)}
                  label="Download price list and floor plans"
                  description={
                    loc.pricelist || showButton("pricelist")
                      ? "Also its link in the page's menu."
                      : "Needs a price list above, or the website's own."
                  }
                />
                <Toggle
                  checked={showButton("tour")}
                  onChange={(on) => setButton("tour", on)}
                  label="Watch the official tour here"
                  description="Opens the tour video in a new tab. Needs a link."
                />
                {showButton("tour") && (
                  <input
                    type="url"
                    inputMode="url"
                    value={loc.tour ?? ""}
                    onChange={(e) => set("tour", e.target.value || null)}
                    placeholder={LOCATION_CARDS[loc.slug]?.tour ?? "Tour link, e.g. https://www.youtube.com/watch?v=…"}
                    className={inputClass}
                  />
                )}
              </div>
            </>
          ),
        },
        section("reveal", "The full-screen photo the intro scrolls away to uncover, and its sticker.", photo("reveal")),
        section(
          "rooms",
          "One tab per room type, with its floor plan, yearly fee and availability badge.",
          <RoomTypesEditor rooms={loc.rooms} setRooms={(rooms) => set("rooms", rooms)} onNewUpload={onNewUpload} />,
        ),
        section(
          "community",
          "The full-screen section the room types scroll away to uncover: its photo and two lines.",
          photo("community"),
        ),
        section(
          "included",
          'The lists under "See what is (included) in my rental", with their icons. A list with nothing in it is left off.',
          <IncludedEditor included={loc.included} onChange={(included) => set("included", included)} icons={icons} />,
        ),
        section(
          "map",
          "The aerial map, shown whole: its labels are part of the photo, so it's never cropped.",
          photo("map"),
        ),
        section(
          "area",
          "The write-up on green, after the map.",
          <StringList
            multiline
            values={loc.area?.paragraphs ?? []}
            onChange={(paragraphs) => set("area", { paragraphs })}
            addLabel="Add a paragraph"
          />,
        ),
        section(
          "neighbourhood",
          'The full-screen photo "A (really) great Location" scrolls away to uncover, and its sticker.',
          photo("neighbourhood"),
        ),
        section(
          "gallery",
          "The gallery carousel. With no photos of its own, it shows the page's other photos.",
          photo("gallery"),
        ),
        section("similar", "The carousel of the other buildings.", fromHome),
        section("beat", "The closing section in this building's colour.", fromHome),
        section("newsletter", "The sign-up form.", fromHome),
        section("dad", "The photo between the two lines. Empty shows the website's own.", photo("dad")),
      ]}
    />
  );
}
