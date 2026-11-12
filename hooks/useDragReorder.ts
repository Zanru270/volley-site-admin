"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type React from "react";

/* Drag-to-reorder for any list, table or grid in the admin, as in the
   Bow + Arc CMS (components/Sortable.tsx wraps it for the forms).

   While an item is dragged by its handle:
   - the browser's drag image is a see-through copy of the whole item, not
     just the handle under the pointer;
   - the list itself reorders as the pointer passes the middle of another
     item, so the gap it will land in is always showing;
   - every item that moves slides into place rather than jumping.
   Letting go keeps the order on screen and calls onCommit if it changed;
   Esc puts back the order from before the drag. Letting go anywhere counts,
   not only over the list: moving a tall item can scroll the list out from
   under the pointer, and the order showing is the one that was chosen.

   Native HTML drag and drop, so desktop only: the arrow buttons beside each
   handle stay the way to reorder on a touch screen. The slide follows any
   change of order, so arrow moves slide too. */

type Options<T> = {
  items: T[];
  getId: (item: T) => string;
  // Each live move during a drag, and the order from before on a cancel.
  onReorder: (next: T[]) => void;
  // Once, on the drop, when the drag changed the order.
  onCommit?: (next: T[], before: T[]) => void;
};

// The empty slot the dragged item leaves behind.
export const DRAG_PLACEHOLDER_CLASS =
  "bg-bone/50 [&>*]:opacity-30 outline-1 outline-dashed outline-ink/30 -outline-offset-1";

export function useDragReorder<T>({ items, getId, onReorder, onCommit }: Options<T>) {
  const [dragId, setDragId] = useState<string | null>(null);
  // The order from before the drag, put back if it's cancelled.
  const snapshot = useRef<T[] | null>(null);
  const dropped = useRef(false);
  const nodes = useRef(new Map<string, HTMLElement>());
  const positions = useRef(new Map<string, { top: number; left: number }>());
  const order = useRef("");

  /* Slides items into their new places instead of jumping (FLIP): after a
     change of order, each moved item is put back where it was, then eased
     to its new place. Only on a change of order: typing that makes a field
     taller must not set the items below it sliding. offsetTop/offsetLeft
     rather than getBoundingClientRect, so neither page scroll nor a slide
     still under way reads as movement. */
  const ids = items.map(getId).join("\u0000");
  useLayoutEffect(() => {
    const animate = order.current !== "" && order.current !== ids;
    order.current = ids;
    const next = new Map<string, { top: number; left: number }>();
    nodes.current.forEach((el, id) => {
      const pos = { top: el.offsetTop, left: el.offsetLeft };
      next.set(id, pos);
      const prev = positions.current.get(id);
      if (!animate || !prev || (prev.top === pos.top && prev.left === pos.left)) return;
      el.style.transition = "none";
      el.style.transform = `translate(${prev.left - pos.left}px, ${prev.top - pos.top}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "transform 200ms ease";
        el.style.transform = "";
        // Hand transitions back to the item's own classes once it's there.
        setTimeout(() => {
          if (el.style.transform === "") el.style.transition = "";
        }, 250);
      });
    });
    positions.current = next;
  });

  /* While a drag is on, the whole page takes the drop, so letting go
     anywhere keeps the order (Esc ends a drag with no drop at all). Taking
     it also stops the browser's own drop, which would type the item's id
     into a text field let go over. */
  useEffect(() => {
    if (!dragId) return;
    const accept = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      dropped.current = true;
    };
    window.addEventListener("dragover", accept, true);
    window.addEventListener("drop", drop, true);
    return () => {
      window.removeEventListener("dragover", accept, true);
      window.removeEventListener("drop", drop, true);
    };
  }, [dragId]);

  const setGhost = (e: React.DragEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const table = el.tagName === "TR" ? el.closest("table") : null;
    if (!table) {
      e.dataTransfer.setDragImage(el, offsetX, offsetY);
      return;
    }
    /* A bare <tr> makes a poor drag image (Safari often draws it blank, and
       its cells lose their widths), so the row is copied into a throwaway
       table off screen, with the column widths pinned. */
    const ghost = document.createElement("table");
    ghost.className = table.className;
    ghost.style.cssText = `position:fixed;top:-10000px;left:-10000px;width:${rect.width}px;background:#fff;`;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.transform = "";
    Array.from(el.children).forEach((cell, i) => {
      (clone.children[i] as HTMLElement).style.width = `${cell.getBoundingClientRect().width}px`;
    });
    const body = document.createElement("tbody");
    body.appendChild(clone);
    ghost.appendChild(body);
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, offsetX, offsetY);
    setTimeout(() => ghost.remove(), 0);
  };

  const startDrag = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    const el = nodes.current.get(id);
    if (el) setGhost(e, el);
    e.dataTransfer.effectAllowed = "move";
    // Firefox won't start a drag without some data set.
    e.dataTransfer.setData("text/plain", id);
    snapshot.current = items;
    dropped.current = false;
    setDragId(id);
  };

  const endDrag = (e: React.DragEvent) => {
    e.stopPropagation();
    const before = snapshot.current;
    if (before) {
      if (!dropped.current) onReorder(before);
      else if (before.some((item, i) => getId(item) !== getId(items[i]))) onCommit?.(items, before);
    }
    snapshot.current = null;
    setDragId(null);
  };

  /* Moves the dragged item once the pointer passes the middle of the item
     it's over, in the direction it's travelling. Waiting for the middle,
     rather than swapping on first touch, stops two items flickering back
     and forth. Items on one row (a grid) compare sideways, others up and down. */
  const dragOverItem = (e: React.DragEvent<HTMLElement>, overId: string) => {
    if (!dragId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (overId === dragId) return;
    const from = items.findIndex((item) => getId(item) === dragId);
    const to = items.findIndex((item) => getId(item) === overId);
    if (from < 0 || to < 0) return;
    const over = e.currentTarget.getBoundingClientRect();
    const dragged = nodes.current.get(dragId)?.getBoundingClientRect();
    const sameRow = dragged && Math.abs(dragged.top - over.top) < over.height / 2;
    const pastMiddle = sameRow
      ? e.clientX - over.left > over.width / 2
      : e.clientY - over.top > over.height / 2;
    if ((from < to && pastMiddle) || (from > to && !pastMiddle)) {
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
    }
  };

  return {
    // The id of the item being dragged, or null: style its slot off this.
    dragId,
    // Spread on the element around all the items.
    containerProps: {
      onDragOver: (e: React.DragEvent) => {
        if (dragId) e.preventDefault();
      },
      // The list is already in its final order when the item is let go,
      // so a drop only confirms it.
      onDrop: (e: React.DragEvent) => {
        if (!dragId) return;
        e.preventDefault();
        e.stopPropagation();
        dropped.current = true;
      },
    },
    // Spread on each item (row, card, tile).
    itemProps: (id: string) => ({
      ref: (el: HTMLElement | null) => {
        if (el) nodes.current.set(id, el);
        else nodes.current.delete(id);
      },
      onDragOver: (e: React.DragEvent<HTMLElement>) => dragOverItem(e, id),
    }),
    // Spread on the grip: the one part that can be dragged.
    handleProps: (id: string) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => startDrag(e, id),
      onDragEnd: endDrag,
    }),
  };
}
