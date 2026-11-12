"use client";

/* eslint-disable @next/next/no-img-element -- the website's own logos */
import { useState, type ReactNode } from "react";
import { Field, inputClass, labelClass, tab, tabs, textareaClass, Toggle } from "@/components/ui";
import { RowControls, StringList } from "@/components/forms";
import CollapsibleList from "@/components/CollapsibleList";
import Sortable from "@/components/Sortable";
import ImageUploader from "@/components/ImageUploader";
import { siteAsset } from "@/lib/site";
import type { Banner, HighlightCard, HomePage, Review } from "@/lib/types";

/* The home page's field editors, shared by its two views: the live editor's
   cards (HomeLiveEditor.tsx) and its form view (HomeForm.tsx). Each takes a
   value and reports the changed one; nothing here saves. */

export function Text({
  label,
  hint,
  value,
  onChange,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </Field>
  );
}

export function Area({
  label,
  hint,
  value,
  onChange,
  rows = 3,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={textareaClass}
      />
    </Field>
  );
}

type Logo = HomePage["welcome"]["logos"][number];

/* The scrolling row of logos: a name each, reorder, remove, and an upload
   that adds one to the end. `onAdd` is separate from `onChange` because an
   upload finishes later, when `logos` here may be out of date. */
export function LogosList({
  logos,
  onChange,
  onAdd,
}: {
  logos: Logo[];
  onChange: (logos: Logo[]) => void;
  onAdd: (src: string) => void;
}) {
  return (
    <div className="space-y-3">
      <span className={labelClass}>Logos</span>
      <p className="text-xs text-ink/50">
        The row that scrolls across the screen, in this order. Upload an SVG, or a PNG with a
        transparent background; the site shows them small and in grey.
      </p>
      <Sortable items={logos} onChange={onChange} className="space-y-3" itemClassName="flex items-center gap-3 rounded-lg">
        {(logo, sort) => (
          <>
            <span className="flex h-11 w-28 shrink-0 items-center justify-center rounded-lg border border-ink/10 bg-bone/60 px-3">
              <img src={siteAsset(logo.src)} alt="" className="max-h-6 max-w-full object-contain grayscale" />
            </span>
            <input
              value={logo.alt}
              placeholder="Whose logo it is, e.g. VISI (optional)"
              aria-label={`Logo ${sort.index + 1}: name`}
              onChange={(e) =>
                onChange(logos.map((old, j) => (j === sort.index ? { ...old, alt: e.target.value } : old)))
              }
              className={inputClass}
            />
            <RowControls {...sort.row} onRemove={sort.remove} removeLabel="Remove logo" />
          </>
        )}
      </Sortable>
      {/* An empty uploader: each logo uploaded joins the end of the row. */}
      <ImageUploader
        value={null}
        onChange={(src) => src && onAdd(src)}
        preset="logo"
        label="Add a logo"
        folder="logos"
      />
    </div>
  );
}

// The resident reviews: quote and name each, with add, reorder and remove.
export function ReviewsList({
  items,
  onChange,
}: {
  items: Review[];
  onChange: (items: Review[]) => void;
}) {
  return (
    <div className="space-y-3">
      <span className={labelClass}>Reviews</span>
      <CollapsibleList
        items={items}
        onChange={onChange}
        title={(review) => review.name}
        untitled="New review"
        summary={(review) => (review.quote ? `“${review.quote.slice(0, 40)}${review.quote.length > 40 ? "…" : ""}”` : null)}
        make={() => ({ quote: "", name: "" })}
        addLabel="Add a review"
        removeLabel="Remove review"
      >
        {(review, setReview) => (
          <>
            <Area
              label="Quote"
              hint="Without quotation marks: the site adds them."
              rows={4}
              value={review.quote}
              onChange={(quote) => setReview({ ...review, quote })}
            />
            <Text label="Name" value={review.name} onChange={(name) => setReview({ ...review, name })} />
          </>
        )}
      </CollapsibleList>
    </div>
  );
}

type Highlights = HomePage["highlights"];
type HighlightTab = "amenities" | "included";

// The Highlights section's cards, a tab at a time, as the site's toggle has them.
export function HighlightTabs({
  highlights,
  onChange,
}: {
  highlights: Highlights;
  onChange: (patch: Partial<Highlights>) => void;
}) {
  const [active, setActive] = useState<HighlightTab>("amenities");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={labelClass}>Cards</span>
        <div className={tabs}>
          <button type="button" onClick={() => setActive("amenities")} className={tab(active === "amenities")}>
            Amenities and services ({highlights.amenities.length})
          </button>
          <button type="button" onClick={() => setActive("included")} className={tab(active === "included")}>
            Included in my rent ({highlights.included.length})
          </button>
        </div>
      </div>
      <p className="text-xs text-ink/50">Click a card to edit it. The site numbers them in this order.</p>
      <HighlightCards key={active} cards={highlights[active]} onChange={(cards) => onChange({ [active]: cards })} />
    </div>
  );
}

// One tab's highlight cards, in the shared list: a row each, opening to its fields.
function HighlightCards({
  cards,
  onChange,
}: {
  cards: HighlightCard[];
  onChange: (cards: HighlightCard[]) => void;
}) {
  return (
    <CollapsibleList
      items={cards}
      onChange={onChange}
      title={(card) => card.title}
      untitled="New card"
      make={() => ({ title: "", note: "", description: [], items: [] })}
      addLabel="Add a card"
      removeLabel="Remove card"
    >
      {(card, setCard) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Text label="Title" hint="Shown in capitals." value={card.title} onChange={(title) => setCard({ ...card, title })} />
            <Text
              label="Small print"
              hint="Optional, under the title."
              value={card.note}
              onChange={(note) => setCard({ ...card, note })}
            />
          </div>
          <div className="space-y-1.5">
            <span className={labelClass}>Paragraphs</span>
            <StringList
              values={card.description}
              onChange={(description) => setCard({ ...card, description })}
              addLabel="Add a paragraph"
              multiline
            />
          </div>
          <div className="space-y-1.5">
            <span className={labelClass}>Bullet list</span>
            <StringList values={card.items} onChange={(items) => setCard({ ...card, items })} addLabel="Add a bullet" />
          </div>
        </>
      )}
    </CollapsibleList>
  );
}

// The announcement banner: on or off, then its three pieces of wording and the link.
export function BannerFields({ banner, onChange }: { banner: Banner; onChange: (patch: Partial<Banner>) => void }) {
  return (
    <div className="space-y-5">
      <Toggle
        checked={banner.enabled}
        onChange={(enabled) => onChange({ enabled })}
        label="Show the banner"
        description="Off hides it on every page until it's turned back on."
      />
      <div className="space-y-5 border-t border-ink/10 pt-5">
        <Text
          label="Bold text"
          hint="Shown first. End it with a space if the link follows."
          value={banner.text}
          onChange={(text) => onChange({ text })}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Text
            label="Link text"
            hint="Underlined. Leave empty for no link."
            value={banner.linkText}
            onChange={(linkText) => onChange({ linkText })}
          />
          <Text
            label="Link goes to"
            hint="/apply opens the waitlist, /book-a-tour the tour booking."
            value={banner.linkHref}
            onChange={(linkHref) => onChange({ linkHref })}
          />
        </div>
        <Text label="Text after the link" value={banner.after} onChange={(after) => onChange({ after })} />
      </div>
    </div>
  );
}
