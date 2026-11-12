"use client";

import { Plus } from "lucide-react";
import { button, Field, inputClass, labelClass, textareaClass } from "@/components/ui";
import { RowControls } from "@/components/forms";
import CollapsibleList from "@/components/CollapsibleList";
import Sortable from "@/components/Sortable";
import ImageUploader from "@/components/ImageUploader";
import type { Location, RoomType } from "@/lib/types";

/* A building's "Room types & availability": the intro, the payment plans,
   and the room types, one tab each, with their floor plans, fees and
   availability badges. Shared by the building's live editor (its room
   types card) and its form view (LocationForm). `onNewUpload` hears of
   every floor plan uploaded, so ones never saved can be cleared away. */

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

export default function RoomTypesEditor({
  rooms,
  setRooms,
  onNewUpload,
}: {
  rooms: Location["rooms"];
  setRooms: (rooms: Location["rooms"]) => void;
  onNewUpload: (url: string) => void;
}) {
  return (
    <>
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

        <div className="space-y-2">
          <span className={labelClass}>Room types</span>
          <CollapsibleList
            items={rooms.types}
            onChange={(types) => setRooms({ ...rooms, types })}
            title={(room) => room.label}
            untitled="New room type"
            summary={(room) => [rand(room.fee), room.availability].filter(Boolean).join(" · ")}
            make={newRoom}
            addLabel="Add a room type"
            removeLabel="Remove room type"
          >
            {(room, setRoomType) => {
              return (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <Field label="Name" hint='The tab, e.g. "Bachelor unit".'>
                      <input value={room.label} onChange={(e) => setRoomType({ ...room, label: e.target.value })} className={inputClass} />
                    </Field>
                    <Field label="Yearly fee (rand)" hint={room.fee ? `Shows as ${rand(room.fee)}. Leave empty to hide the fee rows.` : "Leave empty to hide the fee rows."}>
                      <input
                        type="number"
                        min={0}
                        value={room.fee ?? ""}
                        onChange={(e) => setRoomType({ ...room, fee: e.target.value === "" ? null : Number(e.target.value) })}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Availability badge" hint='e.g. "Limited Availability" or "Fully booked". Empty hides it.'>
                      <input value={room.availability} onChange={(e) => setRoomType({ ...room, availability: e.target.value })} className={inputClass} />
                    </Field>
                    <div className="space-y-2">
                      <span className={labelClass}>Badge colour</span>
                      <div className="flex flex-wrap gap-2 py-1">
                        {BADGE_COLOURS.map(([value, label, swatch]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRoomType({ ...room, badgeColor: value })}
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
                      <textarea rows={3} value={room.description} onChange={(e) => setRoomType({ ...room, description: e.target.value })} className={`${textareaClass} bg-white`} />
                    </Field>
                    <Field label="Under the fee" hint="What the fee covers." className="md:col-span-2">
                      <textarea rows={2} value={room.feeNote} onChange={(e) => setRoomType({ ...room, feeNote: e.target.value })} className={`${textareaClass} bg-white`} />
                    </Field>
                  </div>
                  <div className="space-y-3">
                    <span className={labelClass}>Floor plans</span>
                    <Sortable
                      items={room.images}
                      onChange={(images) => setRoomType({ ...room, images })}
                      className="space-y-3"
                      itemClassName="flex items-start gap-2 rounded-lg"
                    >
                      {(img, imageSort) => {
                        const k = imageSort.index;
                        return (
                          <>
                            <div className="min-w-0 flex-1 space-y-2">
                              <ImageUploader
                                value={img.src || null}
                                onChange={(src) =>
                                  setRoomType({ ...room, images: room.images.map((o, j) => (j === k ? { ...o, src: src ?? "" } : o)) })
                                }
                                onNewUpload={onNewUpload}
                                preset="floorplan"
                                folder="floorplans"
                              />
                            </div>
                            <RowControls {...imageSort.row} onRemove={imageSort.remove} />
                          </>
                        );
                      }}
                    </Sortable>
                    <button type="button" onClick={() => setRoomType({ ...room, images: [...room.images, { src: "", alt: "" }] })} className={button.ghost}>
                      <Plus className="size-4" /> Add a floor plan
                    </button>
                  </div>
                </>
              );
            }}
          </CollapsibleList>
        </div>
      </div>
    )}
    </>
  );
}
