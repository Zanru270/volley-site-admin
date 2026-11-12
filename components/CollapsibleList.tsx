"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { button, CountChip } from "@/components/ui";
import { RowControls } from "@/components/forms";
import Sortable from "@/components/Sortable";

/* The admin's one way to edit a list of things with several fields each
   (highlight cards, reviews, room types, groups of viewing days, an
   article's blocks): a numbered row per item showing its title, which opens
   to its fields, one at a time so a long list stays scannable. Every row
   has the same grip, arrows and bin (Undo on the toast brings a removed one
   back), and the list ends with the same "+ Add …" button, which adds one
   and opens it. Simple lists of single fields (paragraphs, bullets) are
   StringList instead, and photos PhotoGallery. */
export default function CollapsibleList<T>({
  items,
  onChange,
  title,
  untitled,
  summary,
  make,
  addLabel,
  removeLabel = "Remove",
  extraAdd,
  children,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  // A row's heading: the item's name, or `untitled` while it has none.
  title: (item: T) => string;
  untitled: string;
  // A short line beside the title, e.g. how many slots or photos.
  summary?: (item: T) => ReactNode;
  // A new, empty item, for the Add button.
  make?: () => T;
  addLabel?: string;
  removeLabel?: string;
  // More ways to add, beside the Add button (an article's kinds of block).
  extraAdd?: (add: (item: T) => void) => ReactNode;
  // An open row's fields. `set` replaces the item.
  children: (item: T, set: (next: T) => void, index: number) => ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(null);

  // A new order or a removal keeps the open row open, wherever it went; removed, it closes.
  const reorder = (next: T[]) => {
    if (open !== null) {
      const at = next.indexOf(items[open]);
      setOpen(at < 0 ? null : at);
    }
    onChange(next);
  };
  const add = (item: T) => {
    onChange([...items, item]);
    setOpen(items.length);
  };

  return (
    <div className="space-y-2">
      <Sortable
        items={items}
        onChange={reorder}
        className="space-y-2"
        itemClassName="rounded-xl border border-ink/8 bg-bone/30"
      >
        {(item, sort) => {
          const i = sort.index;
          const isOpen = open === i;
          const name = title(item);
          return (
            <>
              <div className="flex items-center gap-2 py-1.5 pr-2 pl-3">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1.5 text-left"
                >
                  <CountChip>{i + 1}</CountChip>
                  <span className={`truncate text-sm font-medium ${name ? "text-ink" : "text-ink/40"}`}>
                    {name || untitled}
                  </span>
                  {summary && <span className="hidden shrink-0 text-xs text-ink/45 sm:inline">{summary(item)}</span>}
                  <ChevronDown
                    className={`ml-auto size-4 shrink-0 text-ink/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <RowControls {...sort.row} onRemove={sort.remove} removeLabel={removeLabel} />
              </div>
              {isOpen && (
                <div className="space-y-5 border-t border-ink/8 p-4 md:p-5">
                  {children(item, (next) => onChange(items.map((old, j) => (j === i ? next : old))), i)}
                </div>
              )}
            </>
          );
        }}
      </Sortable>
      {(make || extraAdd) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {make && addLabel && (
            <button type="button" onClick={() => add(make())} className={button.ghost}>
              <Plus className="size-4" /> {addLabel}
            </button>
          )}
          {extraAdd?.(add)}
        </div>
      )}
    </div>
  );
}
