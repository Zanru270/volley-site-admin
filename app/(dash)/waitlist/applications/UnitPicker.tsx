"use client";

import { useEffect, useState } from "react";
import { BedDouble, Check, Loader2, User, X } from "lucide-react";
import { tab, tabs } from "@/components/ui";
import type { WaitlistEntry } from "@/lib/waitlist";
import { getPlacementOptions, type PlacementOptions } from "./actions";

import { ROOM_TYPE_LABELS as ROOM_TYPES, unitNumber } from "@/lib/app/unitLabels";

/* Adapted from the Volley app's admin (its waitlist/UnitPicker.tsx), in
   this admin's colours: keep the two in step.

   Accepting someone starts here, full screen: every unit in a building as
   a card listing who sleeps in each bed, full ones greyed out. It opens on
   the building and unit type they asked for on the website. Picking a card
   and confirming hands the unit back through onAccept, which creates the
   account and sends the emails. */
export default function UnitPicker({
  entry,
  accepting,
  onClose,
  onAccept,
}: {
  entry: WaitlistEntry;
  accepting: boolean;
  onClose: () => void;
  onAccept: (apartmentId: string) => void;
}) {
  const [options, setOptions] = useState<PlacementOptions | null>(null);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [roomType, setRoomType] = useState("all");
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getPlacementOptions(entry.id).then((o) => {
      if (!live) return;
      setOptions(o);
      if (o.ok) {
        const building = o.buildingId ?? o.buildings[0]?.id ?? null;
        setBuildingId(building);
        const hasType = o.units.some((u) => u.building_id === building && u.room_type === o.roomType);
        setRoomType(o.roomType && hasType ? o.roomType : "all");
      }
    });
    return () => {
      live = false;
    };
  }, [entry.id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !accepting && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [accepting, onClose]);

  const inBuilding = options?.ok ? options.units.filter((u) => u.building_id === buildingId) : [];
  const types = [...new Set(inBuilding.map((u) => u.room_type))].sort();
  const shown = inBuilding.filter((u) => roomType === "all" || u.room_type === roomType);
  const free = shown.filter((u) => u.residents.length < u.capacity).length;
  const pickedUnit = options?.ok ? options.units.find((u) => u.id === picked) : undefined;
  const building = options?.ok ? options.buildings.find((b) => b.id === buildingId) : undefined;

  return (
    <div className="fixed inset-0 z-100 flex p-2 sm:p-4 md:p-6">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={accepting ? undefined : onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-picker-title"
        className="relative flex w-full animate-pop-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex flex-col gap-4 border-b border-ink/8 px-5 py-5 md:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="unit-picker-title" className="font-publish text-2xl">
                Choose a unit for {entry.name} {entry.surname}
              </h2>
              <p className="mt-1 text-sm text-ink/55">
                They asked for <span className="font-medium text-ink">{entry.house}</span>
                {entry.unit && (
                  <>
                    , <span className="font-medium text-ink">{entry.unit}</span>
                  </>
                )}
                .
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={accepting}
              aria-label="Close"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink/55 transition hover:bg-bone hover:text-ink"
            >
              <X className="size-4.5" />
            </button>
          </div>
          {options?.ok && (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div role="tablist" aria-label="Building" className={tabs}>
                  {options.buildings.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      role="tab"
                      aria-selected={b.id === buildingId}
                      onClick={() => {
                        setBuildingId(b.id);
                        setRoomType("all");
                        setPicked(null);
                      }}
                      className={tab(b.id === buildingId)}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
                <div role="tablist" aria-label="Unit type" className={tabs}>
                  {["all", ...types].map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={t === roomType}
                      onClick={() => setRoomType(t)}
                      className={tab(t === roomType)}
                    >
                      {t === "all" ? "All types" : (ROOM_TYPES[t] ?? t)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-ink/55">
                <span>
                  {free} of {shown.length} with space
                </span>
                <Legend className="bg-white ring-1 ring-ink/20">Free</Legend>
                <Legend className="bg-yellow/40">Has roommates</Legend>
                <Legend className="bg-bone">Full</Legend>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-bone/40 px-5 py-6 md:px-8">
          {!options ? (
            <p className="flex h-full items-center justify-center gap-2 text-sm text-ink/55">
              <Loader2 className="size-4 animate-spin" /> Loading units…
            </p>
          ) : !options.ok ? (
            <p className="mx-auto max-w-lg rounded-2xl border border-pink bg-pink/15 p-4 text-sm text-brick">
              {options.message}
            </p>
          ) : shown.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink/55">No units here.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {shown.map((u) => {
                const full = u.residents.length >= u.capacity;
                const selected = u.id === picked;
                return (
                  <button
                    key={u.id}
                    type="button"
                    disabled={full}
                    aria-pressed={selected}
                    onClick={() => setPicked(u.id)}
                    className={`relative flex flex-col rounded-2xl border p-4 text-left transition ${
                      full
                        ? "cursor-not-allowed border-transparent bg-bone text-ink/40"
                        : selected
                          ? "cursor-pointer border-ink bg-ink text-white shadow-lg"
                          : u.residents.length
                            ? "cursor-pointer border-yellow bg-yellow/20 hover:border-ink/40 hover:shadow-sm"
                            : "cursor-pointer border-ink/12 bg-white hover:border-ink/40 hover:shadow-sm"
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-white text-ink">
                        <Check className="size-3.5" />
                      </span>
                    )}
                    <span className="text-3xl font-semibold tracking-tight tabular-nums">{unitNumber(u.unit_code)}</span>
                    <span className={`text-xs ${selected ? "text-white/70" : "text-ink/55"}`}>
                      {ROOM_TYPES[u.room_type] ?? u.room_type}
                      {full && " · Full"}
                    </span>
                    {/* One line per bed: who sleeps there, or free. */}
                    <span className="mt-3 space-y-1 border-t border-current/10 pt-3">
                      {Array.from({ length: u.capacity }, (_, i) => {
                        const who = u.residents[i];
                        return (
                          <span key={i} className={`flex items-center gap-1.5 truncate text-xs ${who ? "" : "opacity-50"}`}>
                            {who ? <User className="size-3 shrink-0" /> : <BedDouble className="size-3 shrink-0" />}
                            {who ?? "Free bed"}
                          </span>
                        );
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-ink/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p className="text-sm text-ink/55">
            {pickedUnit ? (
              <>
                <span className="font-medium text-ink">Unit {unitNumber(pickedUnit.unit_code)}</span> ·{" "}
                {ROOM_TYPES[pickedUnit.room_type]} · {building?.name}
                {pickedUnit.residents.length > 0 && <> · with {pickedUnit.residents.join(", ")}</>}
              </>
            ) : (
              "Pick a unit to accept them into."
            )}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={accepting}
              className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium text-ink/65 transition hover:bg-bone hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!picked || accepting}
              onClick={() => picked && onAccept(picked)}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green disabled:cursor-not-allowed disabled:opacity-40"
            >
              {accepting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {accepting ? "Setting up their account…" : "Accept & send emails"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-3 rounded ${className}`} />
      {children}
    </span>
  );
}
