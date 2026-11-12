"use client";

import { useEffect, useRef, useState, type DragEvent, type ElementType, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { DRAG_PLACEHOLDER_CLASS, useDragReorder } from "@/hooks/useDragReorder";
import { useToast } from "@/components/ToastProvider";

/* A list whose items can be dragged into a new order by a grip, as in the
   Bow + Arc CMS, and moved with arrow buttons too (the way on a touch
   screen). Used for every list in the admin that has an order: rows in a
   table, cards, paragraphs.

     <Sortable items={list} onChange={setList}>
       {(item, sort) => (
         <div>… <RowControls {...sort.row} onRemove={sort.remove} /></div>
       )}
     </Sortable>

   Each item is wrapped in `itemAs` (a div, or a tr in a table) inside
   `as`. `onChange` gets every live move during a drag; `onCommit` gets the
   final order once, after a drop or an arrow move, with the order from
   before it, for lists that save each change straight away. Items are told
   apart by `getKey`, or, for plain lists like paragraphs, by keys kept here
   that follow each item as it moves. `disabled` turns ordering off, e.g.
   while a search filters the list.

   Removing an item (`remove`) asks nothing: it goes at once, and a toast
   offers Undo, which puts it back where it was. */

export const move = <T,>(list: T[], from: number, to: number): T[] => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

let lastKey = 0;
const newKey = () => `item-${++lastKey}`;

export type SortControls = {
  index: number;
  count: number;
  // The props for RowControls: the grip, and the arrows' move.
  row: { index: number; count: number; onMove: (from: number, to: number) => void; handle: ReactNode };
  remove: () => void;
  dragging: boolean;
  // Spread on the item's own element instead of using `handle`, to drag it
  // by itself (a photo's thumbnail). Empty while ordering is off.
  drag: { draggable?: boolean; onDragStart?: (e: DragEvent) => void; onDragEnd?: (e: DragEvent) => void };
};

export default function Sortable<T>({
  items,
  onChange,
  onCommit,
  getKey,
  as = "div",
  itemAs = "div",
  className,
  itemClassName = "",
  disabled = false,
  children,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  onCommit?: (items: T[], before: T[]) => void;
  getKey?: (item: T) => string;
  as?: ElementType;
  itemAs?: ElementType;
  className?: string;
  itemClassName?: string;
  disabled?: boolean;
  children: (item: T, sort: SortControls) => ReactNode;
}) {
  const Container = as;
  const Item = itemAs;
  const toast = useToast();

  // The latest list and handler, for an Undo pressed after later edits.
  const latest = useRef({ items, onChange });
  useEffect(() => {
    latest.current = { items, onChange };
  });

  /* Keys for items that don't have their own, moved with them. An item
     added at the end gets a new one, and one taken off the end loses its. */
  const [keys, setKeys] = useState<string[]>(() => items.map(newKey));
  let ownKeys = keys;
  if (!getKey && keys.length !== items.length) {
    ownKeys =
      keys.length < items.length
        ? [...keys, ...items.slice(keys.length).map(newKey)]
        : keys.slice(0, items.length);
    setKeys(ownKeys);
  }

  const entries = items.map((item, i) => ({ item, key: getKey ? getKey(item) : ownKeys[i] }));
  type Entry = (typeof entries)[number];
  const apply = (next: Entry[]) => {
    if (!getKey) setKeys(next.map((e) => e.key));
    onChange(next.map((e) => e.item));
  };

  const reorder = useDragReorder({
    items: entries,
    getId: (e) => e.key,
    onReorder: apply,
    onCommit: (next, before) =>
      onCommit?.(
        next.map((e) => e.item),
        before.map((e) => e.item),
      ),
  });

  const moveTo = (from: number, to: number) => {
    const next = move(entries, from, to);
    apply(next);
    onCommit?.(
      next.map((e) => e.item),
      items,
    );
  };

  return (
    <Container className={className} {...(disabled ? {} : reorder.containerProps)}>
      {entries.map(({ item, key }, index) => {
        const dragging = reorder.dragId === key;
        const handle = disabled ? null : (
          <span
            {...reorder.handleProps(key)}
            title="Drag to reorder"
            aria-hidden="true"
            className="hidden cursor-grab items-center justify-center rounded-lg p-2 text-ink/30 transition-colors hover:bg-bone/60 hover:text-ink/70 active:cursor-grabbing md:inline-flex"
          >
            <GripVertical className="size-4" />
          </span>
        );
        return (
          <Item
            key={key}
            {...(disabled ? {} : reorder.itemProps(key))}
            className={`${itemClassName} ${dragging ? DRAG_PLACEHOLDER_CLASS : ""}`}
          >
            {children(item, {
              index,
              count: items.length,
              row: { index, count: items.length, onMove: moveTo, handle },
              remove: () => {
                apply(entries.filter((_, j) => j !== index));
                toast.success("Removed", undefined, {
                  label: "Undo",
                  onClick: () => {
                    const now = latest.current.items;
                    const at = Math.min(index, now.length);
                    latest.current.onChange([...now.slice(0, at), item, ...now.slice(at)]);
                  },
                });
              },
              dragging,
              drag: disabled ? {} : reorder.handleProps(key),
            })}
          </Item>
        );
      })}
    </Container>
  );
}
