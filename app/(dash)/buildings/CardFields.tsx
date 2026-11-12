"use client";

import { Field, inputClass, textareaClass } from "@/components/ui";
import CustomSelect from "@/components/CustomSelect";
import ColourPicker from "@/components/ColourPicker";
import {
  DEFAULT_NAME_COLOUR,
  LOCATION_NAME_COLOURS,
  LOCATION_NAMES,
  LOCATION_STATUSES,
  openingYear,
  statusKind,
  type Visibility,
} from "@/lib/site";
import type { Location } from "@/lib/types";
import { Upload } from "./PhotosEditor";
import VisibilitySelect from "./VisibilitySelect";

/* What a building's card in the Locations carousel says, and the parts of
   the building it's saved to. Edited from the home page (one card at a
   time), and from the building itself: either way it's the same building,
   so the two never disagree. The name is the building's everywhere on the
   website (its page, its card, the lists); the bed count comes from the
   site's code. */
export type CardDetails = {
  // Missing while the database has no name column yet.
  name?: string;
  status: string;
  address: string;
  summary: string;
  // The card's own photo; empty uses the first slide.
  photo: string;
  // Its name's colour over the photo; empty keeps the website's. Missing
  // while the database has no column for it.
  nameColour?: string;
};

export const cardDetailsOf = (
  l: Pick<Location, "name" | "status" | "address" | "summary" | "photos" | "card_colour">,
): CardDetails => ({
  ...(l.name !== undefined ? { name: l.name ?? "" } : {}),
  ...(l.card_colour !== undefined ? { nameColour: l.card_colour ?? "" } : {}),
  status: l.status ?? LOCATION_STATUSES[0],
  address: l.address ?? "",
  summary: l.summary ?? "",
  photo: l.photos?.card ?? "",
});

// A building with `card` written into it: the parts of it the card is.
export const withCardDetails = <L extends Pick<Location, "name" | "status" | "address" | "summary" | "photos" | "card_colour">>(
  l: L,
  card: CardDetails,
): L => ({
  ...l,
  // Empty: back to the website's own name.
  ...(card.name !== undefined ? { name: card.name || null } : {}),
  ...(card.nameColour !== undefined ? { card_colour: card.nameColour || null } : {}),
  status: card.status,
  address: card.address,
  summary: card.summary,
  photos: { ...l.photos, card: card.photo || undefined },
});

/* `visibility`, when given, adds whether the building is on the website
   under its status (VisibilitySelect): it saves straight away, apart
   from the card. */
export default function CardFields({
  slug,
  value,
  onChange,
  onNewUpload,
  visibility,
}: {
  slug: string;
  value: CardDetails;
  onChange: (value: CardDetails) => void;
  onNewUpload: (url: string) => void;
  visibility?: { value: Visibility; onChange: (value: Visibility) => void };
}) {
  const set = (patch: Partial<CardDetails>) => onChange({ ...value, ...patch });
  const shownName = value.name?.trim() || (LOCATION_NAMES[slug] ?? slug).replace(/^Volley /, "");
  return (
    <div className="space-y-5">
      <Field
        label="Name"
        hint={`Shown as "Volley …" on its page, its card and every list on the website. Leave empty for "${(LOCATION_NAMES[slug] ?? slug).replace(/^Volley /, "")}".`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink/60">Volley</span>
          <input
            value={value.name ?? ""}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={(LOCATION_NAMES[slug] ?? slug).replace(/^Volley /, "")}
            className={inputClass}
          />
        </div>
      </Field>
      <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
        <div className="space-y-3">
          {/* "Opening" asks for its year: the badge reads "Opening 2028". */}
          <CustomSelect
            label="Status"
            value={statusKind(value.status)}
            onChange={(kind) =>
              set({ status: kind === "Opening" ? `Opening ${openingYear(value.status) || new Date().getFullYear() + 1}` : kind })
            }
            options={LOCATION_STATUSES.map((s) => ({ value: s, label: s }))}
          />
          {statusKind(value.status) === "Opening" && (
            <Field label="Opening in">
              <input
                inputMode="numeric"
                maxLength={4}
                value={openingYear(value.status) || value.status.replace(/^Opening ?/, "")}
                onChange={(e) => set({ status: `Opening ${e.target.value.replace(/\D/g, "").slice(0, 4)}` })}
                placeholder="2028"
                aria-label="Opening year"
                className={inputClass}
              />
            </Field>
          )}
        </div>
        <Field label="Address" hint="Also under the photos at the top of the building's page.">
          <input value={value.address} onChange={(e) => set({ address: e.target.value })} className={inputClass} />
        </Field>
      </div>
      {visibility && (
        <div className="max-w-sm">
          <VisibilitySelect slug={slug} value={visibility.value} status={value.status} onChange={visibility.onChange} variant="field" />
        </div>
      )}
      <Field label="Card description" hint="A line or two under the address.">
        <textarea rows={2} value={value.summary} onChange={(e) => set({ summary: e.target.value })} className={textareaClass} />
      </Field>
      <div className="space-y-1.5">
        <span className="block text-[13px] font-medium text-ink/70">Card photo</span>
        <div className="max-w-sm">
          <Upload
            value={value.photo}
            onChange={(photo) => set({ photo: photo ?? "" })}
            preset="card"
            focal="card"
            onNewUpload={onNewUpload}
          />
        </div>
        <p className="text-xs text-ink/50">Empty uses the first slide.</p>
      </div>
      {/* Missing while the database has no column for it. */}
      {value.nameColour !== undefined && (
        <ColourPicker
          label="Name colour"
          hint={`"Volley ${shownName}" over the card's photo.`}
          value={value.nameColour}
          fallback={LOCATION_NAME_COLOURS[slug] ?? DEFAULT_NAME_COLOUR}
          onChange={(nameColour) => set({ nameColour })}
          sample={(colour) => (
            <span className="flex flex-col leading-none" style={{ color: colour }}>
              <span className="font-sans text-[11px] tracking-wide uppercase">Volley</span>
              <span className="mt-1 font-serif text-2xl italic">{shownName}</span>
            </span>
          )}
        />
      )}
    </div>
  );
}
