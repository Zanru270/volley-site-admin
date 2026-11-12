"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { button, Field, inputClass, subPanel, textareaClass } from "@/components/ui";
import { RowControls } from "@/components/forms";
import Sortable from "@/components/Sortable";
import { siteAsset } from "@/lib/site";
import { INCLUDED_LISTS } from "@/lib/included";
import type { Included, IncludedItem } from "@/lib/types";

/* A building's "What's included": the paragraph under the fixed heading,
   then its three lists under their fixed headings (lib/included.ts), each
   entry with its icon. An empty list is left off the website, and with
   all three empty, so is the section.

   `icons` are the names of the files in the site's public/icons/included
   (its /api/included-icons): the only icons an entry can have. */

const newItem = (): IncludedItem => ({ label: "", icon: "" });

const iconUrl = (name: string) => siteAsset(`/icons/included/${name}.svg`);

export const emptyIncluded = (): Included => ({ intro: "", building: [], apartment: [], room: [] });

/* One list's entries, numbered, each dragged by its grip (or moved with
   its arrows) to its place: the live editor's dialog for that list. */
export function IncludedListEditor({
  items,
  onChange,
  icons,
}: {
  items: IncludedItem[];
  onChange: (items: IncludedItem[]) => void;
  icons: string[];
}) {
  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-sm text-ink/50">No entries yet, so this list is hidden on the website.</p>}
      <Sortable items={items} onChange={onChange} className="space-y-2" itemClassName="flex items-center gap-2">
        {(item, sort) => {
          const j = sort.index;
          const setItem = (patch: Partial<IncludedItem>) =>
            onChange(items.map((it, k) => (k === j ? { ...it, ...patch } : it)));
          return (
            <>
              <span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums text-ink/45">{j + 1}</span>
              <IconPicker value={item.icon} icons={icons} onChange={(icon) => setItem({ icon })} />
              <input
                value={item.label}
                onChange={(e) => setItem({ label: e.target.value })}
                placeholder="e.g. Bed & mattress"
                aria-label={`Entry ${j + 1}`}
                className={inputClass}
              />
              <RowControls {...sort.row} onRemove={sort.remove} removeLabel="Remove this entry" />
            </>
          );
        }}
      </Sortable>
      <button type="button" onClick={() => onChange([...items, newItem()])} className={button.ghost}>
        <Plus className="size-4" /> Add an entry
      </button>
    </div>
  );
}

// The intro paragraph's field.
export function IncludedIntro({ included, onChange }: { included: Included; onChange: (included: Included) => void }) {
  return (
    <Field label="Intro" hint='The paragraph under "See what is (included) in my rental".'>
      <textarea
        rows={3}
        value={included.intro}
        onChange={(e) => onChange({ ...included, intro: e.target.value })}
        className={textareaClass}
      />
    </Field>
  );
}

// All of it at once: the form view's section.
export default function IncludedEditor({
  included: given,
  onChange,
  icons,
}: {
  included: Included | null | undefined;
  onChange: (included: Included) => void;
  icons: string[];
}) {
  const included = given ?? emptyIncluded();
  return (
    <div className="space-y-4">
      <IncludedIntro included={included} onChange={onChange} />
      {INCLUDED_LISTS.map(([key, title]) => (
        <div key={key} className={`${subPanel} space-y-3`}>
          <p className="text-sm font-medium text-ink">{title}</p>
          <IncludedListEditor
            items={included[key]}
            onChange={(items) => onChange({ ...included, [key]: items })}
            icons={icons}
          />
        </div>
      ))}
    </div>
  );
}

/* The icon beside an item: one of the site's own, picked from a grid. An
   older name with no file of its own (a stand-in) shows by name. */
function IconPicker({ value, icons, onChange }: { value: string; icons: string[]; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const known = icons.includes(value);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={value ? `Icon: ${value}. Change it` : "Pick an icon"}
        title={value || "Pick an icon"}
        className="flex h-10 w-16 cursor-pointer items-center justify-center gap-1 rounded-lg border border-ink/15 bg-white text-ink/50 transition-colors hover:border-ink/40"
      >
        {value && known ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl(value)} alt="" className="size-6 object-contain" />
        ) : (
          <span className="max-w-9 truncate text-[10px]">{value ? value : "Icon"}</span>
        )}
        <ChevronDown className="size-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-12 left-0 z-10 w-72 rounded-xl border border-ink/15 bg-white p-2 shadow-lg">
          {icons.length ? (
            <div className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto">
              {icons.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  title={name}
                  className={`relative flex cursor-pointer flex-col items-center gap-1 rounded-lg p-2 text-[10px] text-ink/60 transition-colors hover:bg-bone ${
                    name === value ? "bg-bone ring-1 ring-ink/30" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={iconUrl(name)} alt="" className="size-7 object-contain" />
                  <span className="w-full truncate text-center">{name}</span>
                  {name === value && <Check className="absolute top-1 right-1 size-3 text-ink" />}
                </button>
              ))}
            </div>
          ) : (
            <p className="p-2 text-xs text-ink/50">
              No icons yet. Add SVG files to the website&apos;s public/icons/included folder.
            </p>
          )}
          {!known && value && (
            <p className="px-2 pt-2 text-[11px] text-ink/45">&ldquo;{value}&rdquo; is a stand-in icon; pick one of yours to replace it.</p>
          )}
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="mt-1 w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs text-ink/60 hover:bg-bone"
          >
            No icon
          </button>
        </div>
      )}
    </div>
  );
}
