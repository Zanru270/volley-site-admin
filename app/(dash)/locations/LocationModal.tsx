"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { button, Field, inputClass, labelClass, textareaClass } from "@/components/ui";
import EditModal, { ModalSection } from "@/components/EditModal";
import { move, RowControls, StringList } from "@/components/forms";
import { ImageField, PdfField } from "@/components/Upload";
import { LOCATION_NAMES } from "@/lib/site";
import type { Location, RoomType } from "@/lib/types";

// The availability badge's fill, from the site's palette.
const BADGE_COLOURS = [
  ["var(--color-lemon)", "Lemon", "#c5ff98"],
  ["var(--color-pink)", "Pink", "#ff9f9a"],
  ["var(--color-yellow)", "Yellow", "#f6eb6d"],
  ["#f3ad55", "Orange", "#f3ad55"],
  ["var(--color-stone)", "Stone", "#aba79e"],
] as const;

const newRoom = (): RoomType => ({
  label: "",
  description: "",
  images: [],
  fee: null,
  availability: "",
  badgeColor: "var(--color-lemon)",
  feeNote: "",
});

const rand = (n: number | null) =>
  n === null ? "" : `R${n.toLocaleString("en-ZA")}`;

/* One residence's editable parts, in the wide drawer. Nothing is saved
   until Save; the list page does the saving through onSave. */
export default function LocationModal({
  location: initial,
  saving,
  onClose,
  onSave,
}: {
  location: Location;
  saving: boolean;
  onClose: () => void;
  onSave: (location: Location) => void;
}) {
  const [loc, setLoc] = useState<Location>({
    ...initial,
    // The description is edited as paragraphs whether it was saved as one
    // string or several.
    description: Array.isArray(initial.description)
      ? initial.description
      : initial.description
        ? [initial.description]
        : [],
    stats: initial.stats ?? [],
  });

  const set = <K extends keyof Location>(key: K, value: Location[K]) =>
    setLoc((l) => ({ ...l, [key]: value }));
  const stats = loc.stats ?? [];
  const rooms = loc.rooms;
  const setRooms = (next: Location["rooms"]) => set("rooms", next);
  const setRoom = (i: number, room: RoomType) =>
    rooms && setRooms({ ...rooms, types: rooms.types.map((r, j) => (j === i ? room : r)) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(loc);
  };

  return (
    <EditModal
      isOpen
      wide
      onClose={onClose}
      title={`Edit ${LOCATION_NAMES[loc.slug] ?? loc.slug}`}
      formId="location-form"
      saveLabel="Save Location"
      isSaving={saving}
    >
      <form id="location-form" onSubmit={submit} className="space-y-8">
        <div className="space-y-6">
          <p className="text-xs text-ink/50">The section under the photos at the top of the page.</p>
          <Field label="Address">
            <input value={loc.address ?? ""} onChange={(e) => set("address", e.target.value)} className={inputClass} />
          </Field>
          <div className="space-y-2">
            <span className={labelClass}>Description</span>
            <StringList
              multiline
              values={loc.description as string[]}
              onChange={(d) => set("description", d)}
              addLabel="Add a paragraph"
            />
          </div>
          <div className="space-y-2">
            <span className={labelClass}>Pricelist</span>
            <PdfField value={loc.pricelist ?? ""} onChange={(v) => set("pricelist", v)} folder="pricelists" />
            <p className="text-xs text-ink/50">The download button. Leave empty for no button.</p>
          </div>
        </div>

        <ModalSection title="Headline figures" description="Up to two, in the row under the intro.">
          <div className="space-y-3">
            {stats.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <input
                  value={s.label}
                  onChange={(e) => set("stats", stats.map((o, j) => (j === i ? { ...o, label: e.target.value } : o)))}
                  placeholder="Label, e.g. Rentals / student start at:"
                  className={inputClass}
                />
                <input
                  value={s.value}
                  onChange={(e) => set("stats", stats.map((o, j) => (j === i ? { ...o, value: e.target.value } : o)))}
                  placeholder="Figure, e.g. R8,790/ month"
                  className={`${inputClass} sm:max-w-48`}
                />
                <RowControls
                  index={i}
                  count={stats.length}
                  onMove={(a, b) => set("stats", move(stats, a, b))}
                  onRemove={() => set("stats", stats.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            {stats.length < 2 && (
              <button type="button" onClick={() => set("stats", [...stats, { label: "", value: "" }])} className={button.ghost}>
                <Plus className="size-4" /> Add a figure
              </button>
            )}
          </div>
        </ModalSection>

        <ModalSection
          title="Room types & availability"
          description="One tab per room type, with its floor plan, yearly fee and availability badge."
        >
          {!rooms ? (
            <div className="text-sm text-ink/50">
              <p className="mb-3">This page has no room types section yet.</p>
              <button
                type="button"
                onClick={() => setRooms({ intro: "", paymentPlans: [12, 4, 2, 1], types: [newRoom()] })}
                className={button.secondary}
              >
                <Plus className="size-4" /> Add room types
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <Field label="Intro" hint="The paragraph under the heading.">
                <textarea rows={3} value={rooms.intro} onChange={(e) => setRooms({ ...rooms, intro: e.target.value })} className={textareaClass} />
              </Field>
              <Field label="Payment plans" hint="Instalments the fee can be split into, in dropdown order, e.g. 12, 4, 2, 1. The first is the default.">
                <input
                  value={rooms.paymentPlans.join(", ")}
                  onChange={(e) =>
                    setRooms({
                      ...rooms,
                      paymentPlans: e.target.value.split(/[,\s]+/).filter(Boolean).map(Number),
                    })
                  }
                  className={`${inputClass} max-w-xs`}
                />
              </Field>

              {rooms.types.map((room, i) => (
                <div key={i} className="border border-ink/10 bg-bone/25 p-4 md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="font-medium">{room.label || "New room type"}</p>
                    <RowControls
                      index={i}
                      count={rooms.types.length}
                      onMove={(a, b) => setRooms({ ...rooms, types: move(rooms.types, a, b) })}
                      onRemove={() => setRooms({ ...rooms, types: rooms.types.filter((_, j) => j !== i) })}
                      removeLabel="Remove room type"
                    />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <Field label="Name" hint='The tab, e.g. "Bachelor unit".'>
                      <input value={room.label} onChange={(e) => setRoom(i, { ...room, label: e.target.value })} className={inputClass} />
                    </Field>
                    <Field label="Yearly fee (rand)" hint={room.fee ? `Shows as ${rand(room.fee)}. Leave empty to hide the fee rows.` : "Leave empty to hide the fee rows."}>
                      <input
                        type="number"
                        min={0}
                        value={room.fee ?? ""}
                        onChange={(e) => setRoom(i, { ...room, fee: e.target.value === "" ? null : Number(e.target.value) })}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Availability badge" hint='e.g. "Limited Availability" or "Fully booked". Empty hides it.'>
                      <input value={room.availability} onChange={(e) => setRoom(i, { ...room, availability: e.target.value })} className={inputClass} />
                    </Field>
                    <div className="space-y-2">
                      <span className={labelClass}>Badge colour</span>
                      <div className="flex flex-wrap gap-2 py-1">
                        {BADGE_COLOURS.map(([value, label, swatch]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRoom(i, { ...room, badgeColor: value })}
                            title={label}
                            aria-label={label}
                            aria-pressed={room.badgeColor === value}
                            className={`size-8 cursor-pointer rounded-full border-2 ${room.badgeColor === value ? "border-ink" : "border-white ring-1 ring-ink/20"}`}
                            style={{ background: swatch }}
                          />
                        ))}
                      </div>
                    </div>
                    <Field label="Description" className="md:col-span-2">
                      <textarea rows={3} value={room.description} onChange={(e) => setRoom(i, { ...room, description: e.target.value })} className={`${textareaClass} bg-white`} />
                    </Field>
                    <Field label="Under the fee" hint="What the fee covers." className="md:col-span-2">
                      <textarea rows={2} value={room.feeNote} onChange={(e) => setRoom(i, { ...room, feeNote: e.target.value })} className={`${textareaClass} bg-white`} />
                    </Field>
                  </div>
                  <div className="mt-6 space-y-3">
                    <span className={labelClass}>Floor plans</span>
                    {room.images.map((img, k) => (
                      <div key={k} className="flex items-start gap-2">
                        <div className="min-w-0 flex-1 space-y-2">
                          <ImageField
                            value={img.src}
                            onChange={(src) => setRoom(i, { ...room, images: room.images.map((o, j) => (j === k ? { ...o, src } : o)) })}
                            folder="floorplans"
                          />
                          <input
                            value={img.alt}
                            onChange={(e) => setRoom(i, { ...room, images: room.images.map((o, j) => (j === k ? { ...o, alt: e.target.value } : o)) })}
                            placeholder="Describe the floor plan"
                            className={inputClass}
                          />
                        </div>
                        <RowControls
                          index={k}
                          count={room.images.length}
                          onMove={(a, b) => setRoom(i, { ...room, images: move(room.images, a, b) })}
                          onRemove={() => setRoom(i, { ...room, images: room.images.filter((_, j) => j !== k) })}
                        />
                      </div>
                    ))}
                    <button type="button" onClick={() => setRoom(i, { ...room, images: [...room.images, { src: "", alt: "" }] })} className={button.ghost}>
                      <Plus className="size-4" /> Add a floor plan
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setRooms({ ...rooms, types: [...rooms.types, newRoom()] })} className={button.secondary}>
                <Plus className="size-4" /> Add a room type
              </button>
            </div>
          )}
        </ModalSection>
      </form>
    </EditModal>
  );
}
