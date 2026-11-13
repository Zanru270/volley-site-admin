"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { button, iconButton, iconButtonDanger, inputClass, textareaClass } from "@/components/ui";
import { useToast, type ToastAction } from "@/components/ToastProvider";
import type { Result } from "@/lib/result";
import Sortable from "@/components/Sortable";

export { move } from "@/components/Sortable";

/* Client helpers shared by the editors. Saves report through toasts, as in
   the Bow + Arc CMS. */

/* A single-page settings form (banner, schedule): the value being edited,
   whether it differs from what's saved (for SaveButton's "Saved" state),
   save(), which sends it to a server action, and reset(), which puts back
   what's saved. */
export function useSettingsForm<T>(initial: T, action: (value: T) => Promise<Result>) {
  const toast = useToast();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);

  const save = () =>
    start(async () => {
      const snapshot = value;
      try {
        const result = await action(snapshot);
        toast.result(result);
        if (result.ok) setSaved(snapshot);
      } catch (err) {
        toast.error("Not saved", (err as Error).message);
      }
    });

  const reset = () => setValue(saved);

  return { value, setValue, saved, dirty, pending, save, reset };
}

/* Runs a server action from a list page (save from a drawer, delete,
   reorder): toasts the outcome (with `action` on the toast, e.g. Undo) and
   refreshes the page's data. Resolves to whether it worked, so the caller
   can close its drawer.

   `show`, when given, puts the outcome on screen straight away (a
   useOptimistic setter: the row gone, the new status), before the server
   answers. React drops it when the action ends: for the refreshed data if
   it worked, for what was there if it didn't. Never for an action that
   emails anyone; that waits until it's done. */
export function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (action: () => Promise<Result>, title?: string, toastAction?: ToastAction, show?: () => void) =>
    new Promise<boolean>((resolve) =>
      start(async () => {
        show?.();
        try {
          const result = await action();
          toast.result(result, title, toastAction);
          if (result.ok) router.refresh();
          resolve(result.ok);
        } catch (err) {
          toast.error("Not saved", (err as Error).message);
          resolve(false);
        }
      }),
    );

  return { pending, run };
}

/* The controls on a row in a list: its grip to drag it by (`handle`, from
   Sortable, which also fills in the rest), move up, move down, remove. */
export function RowControls({
  index,
  count,
  onMove,
  handle,
  onRemove,
  removeLabel = "Remove",
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  handle?: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <div className="flex shrink-0 items-center">
      {handle}
      <button
        type="button"
        className={iconButton}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        aria-label="Move up"
      >
        <ArrowUp className="size-4" />
      </button>
      <button
        type="button"
        className={iconButton}
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
        aria-label="Move down"
      >
        <ArrowDown className="size-4" />
      </button>
      {onRemove && (
        <button type="button" className={iconButtonDanger} onClick={onRemove} aria-label={removeLabel}>
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

/* A list of strings: paragraphs, bullets, closed dates. One field each,
   with add, remove, and reorder by dragging or the arrows. */
export function StringList({
  values,
  onChange,
  addLabel = "Add",
  placeholder,
  multiline = false,
  type = "text",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  addLabel?: string;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  const set = (i: number, v: string) => onChange(values.map((old, j) => (j === i ? v : old)));
  return (
    <div className="space-y-2">
      <Sortable
        items={values}
        onChange={onChange}
        className="space-y-2"
        itemClassName="flex items-start gap-2 rounded-lg"
      >
        {(value, sort) => (
          <>
            {multiline ? (
              <textarea
                value={value}
                rows={3}
                onChange={(e) => set(sort.index, e.target.value)}
                placeholder={placeholder}
                className={textareaClass}
              />
            ) : (
              <input
                type={type}
                value={value}
                onChange={(e) => set(sort.index, e.target.value)}
                placeholder={placeholder}
                className={inputClass}
              />
            )}
            <RowControls {...sort.row} onRemove={sort.remove} />
          </>
        )}
      </Sortable>
      <button type="button" onClick={() => onChange([...values, ""])} className={button.ghost}>
        <Plus className="size-4" /> {addLabel}
      </button>
    </div>
  );
}
