"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { button, iconButton, iconButtonDanger, inputClass, textareaClass } from "@/components/ui";
import { useToast } from "@/components/ToastProvider";
import type { Result } from "@/lib/result";

/* Client helpers shared by the editors. Saves report through toasts, as in
   the Bow + Arc CMS. */

/* A single-page settings form (banner, schedule): the value being edited,
   whether it differs from what's saved (for SaveButton's "Saved" state),
   and save(), which sends it to a server action. */
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

  return { value, setValue, dirty, pending, save };
}

/* Runs a server action from a list page (save from a drawer, delete,
   reorder): toasts the outcome and refreshes the page's data. Resolves to
   whether it worked, so the caller can close its drawer. */
export function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (action: () => Promise<Result>, title?: string) =>
    new Promise<boolean>((resolve) =>
      start(async () => {
        try {
          const result = await action();
          toast.result(result, title);
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

// Move up / move down / remove, for a row in a list.
export function RowControls({
  index,
  count,
  onMove,
  onRemove,
  removeLabel = "Remove",
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <div className="flex shrink-0 items-center">
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

export function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/* A list of strings: paragraphs, bullets, closed dates. One field each,
   with add, reorder and remove. */
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
  const set = (i: number, v: string) =>
    onChange(values.map((old, j) => (j === i ? v : old)));
  return (
    <div className="space-y-2">
      {values.map((value, i) => (
        <div key={i} className="flex items-start gap-2">
          {multiline ? (
            <textarea
              value={value}
              rows={3}
              onChange={(e) => set(i, e.target.value)}
              placeholder={placeholder}
              className={textareaClass}
            />
          ) : (
            <input
              type={type}
              value={value}
              onChange={(e) => set(i, e.target.value)}
              placeholder={placeholder}
              className={inputClass}
            />
          )}
          <RowControls
            index={i}
            count={values.length}
            onMove={(a, b) => onChange(move(values, a, b))}
            onRemove={() => onChange(values.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, ""])} className={button.ghost}>
        <Plus className="size-4" /> {addLabel}
      </button>
    </div>
  );
}
