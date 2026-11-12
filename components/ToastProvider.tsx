"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, ChevronUp, X, XCircle } from "lucide-react";
import type { Result } from "@/lib/result";

/* Toasts in the top right: every save reports here rather than beside
   its button. Successes go after 4 s, errors stay 8 s so there's time to
   read them, and one with an action (Undo) stays 8 s too.

   They stack: the newest shows, with up to two more peeking out behind
   it and a count of the rest, so a run of them (a dozen photos removed)
   never covers the screen. A click on the stack opens it into a list,
   newest first, which waits until it's closed again: nothing goes while
   it's being read. */

// How many toasts peek out behind the newest.
const PEEK = 2;

type ToastItem = {
  id: string;
  variant: "success" | "error";
  title: string;
  message?: string;
  action?: ToastAction;
};

// A button on the toast, e.g. Undo for a change that saved straight away.
export type ToastAction = { label: string; onClick: () => void };

type ToastApi = {
  success: (title: string, message?: string, action?: ToastAction) => void;
  error: (title: string, message?: string) => void;
  // A server action's Result: green if it saved (with `action`, if given),
  // red with its message if not.
  result: (result: Result, title?: string, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const lifetime = (t: ToastItem) => (t.variant === "success" && !t.action ? 4000 : 8000);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  // Each toast's timer, so an open list can hold them all.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const expandedRef = useRef(false);

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const schedule = useCallback(
    (t: ToastItem) => timers.current.set(t.id, setTimeout(() => dismiss(t.id), lifetime(t))),
    [dismiss],
  );

  const add = useCallback(
    (variant: ToastItem["variant"], title: string, message?: string, action?: ToastAction) => {
      const t = { id: crypto.randomUUID(), variant, title, message, action };
      setToasts((prev) => [...prev, t]);
      if (!expandedRef.current) schedule(t);
    },
    [schedule],
  );

  // Open: every timer stops. Closed again: each starts over.
  const toastsRef = useRef(toasts);
  useEffect(() => {
    toastsRef.current = toasts;
  });
  useEffect(() => {
    expandedRef.current = expanded;
    if (expanded) {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    } else toastsRef.current.forEach((t) => !timers.current.has(t.id) && schedule(t));
  }, [expanded, schedule]);

  // Down to one (or none): nothing to open.
  if (expanded && toasts.length <= 1) setExpanded(false);
  const open = expanded && toasts.length > 1;

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    setToasts([]);
    setExpanded(false);
  };

  const toast = useMemo<ToastApi>(
    () => ({
      success: (title, message, action) => add("success", title, message, action),
      error: (title, message) => add("error", title, message),
      result: (r, title, action) =>
        r.ok
          ? add("success", title ?? "Saved", r.message, action)
          : add("error", "Not saved", r.message),
    }),
    [add],
  );

  return (
    <ToastContext value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed top-6 right-6 z-200 w-80 max-w-[calc(100vw-32px)]">
        {open ? (
          <div className="pointer-events-auto flex max-h-[calc(100vh-48px)] flex-col gap-2">
            <div className="flex items-center justify-between rounded-xl bg-white/95 px-3 py-2 text-xs shadow-soft">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex cursor-pointer items-center gap-1 font-medium text-ink hover:text-ink/70"
              >
                <ChevronUp className="size-3.5" /> Show less
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="cursor-pointer text-ink/60 underline underline-offset-2 hover:text-ink"
              >
                Clear all ({toasts.length})
              </button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto pb-1">
              {[...toasts].reverse().map((t) => (
                <Toast key={t.id} toast={t} dismiss={dismiss} />
              ))}
            </div>
          </div>
        ) : (
          toasts.length > 0 && (
            <Stack toasts={toasts} dismiss={dismiss} onOpen={() => setExpanded(true)} />
          )
        )}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/* The closed stack: the newest toast, with blank cards for the next few
   peeking out under it, and how many more there are. A click anywhere on
   it but its buttons opens the list. */
function Stack({
  toasts,
  dismiss,
  onOpen,
}: {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
  onOpen: () => void;
}) {
  const newest = toasts[toasts.length - 1];
  const behind = Math.min(toasts.length - 1, PEEK);
  const more = toasts.length - 1;
  return (
    <div
      className={`pointer-events-auto relative ${more ? "cursor-pointer" : ""}`}
      style={{ marginBottom: behind * 8 }}
      onClick={(e) => {
        if (more && !(e.target as HTMLElement).closest("button")) onOpen();
      }}
    >
      {Array.from({ length: behind }, (_, i) => behind - i).map((depth) => (
        <div
          key={depth}
          aria-hidden="true"
          className="absolute inset-0 rounded-xl border border-ink/10 bg-white shadow-soft transition-transform"
          style={{ transform: `translateY(${depth * 8}px) scale(${1 - depth * 0.05})` }}
        />
      ))}
      <Toast toast={newest} dismiss={dismiss} more={more} />
    </div>
  );
}

function Toast({ toast: t, dismiss, more = 0 }: { toast: ToastItem; dismiss: (id: string) => void; more?: number }) {
  return (
    <div
      role={t.variant === "error" ? "alert" : "status"}
      className="relative flex w-full animate-toast-in items-start gap-4 rounded-xl border border-ink/10 bg-white p-4 shadow-soft"
    >
      <span className="mt-0.5 shrink-0">
        {t.variant === "success" ? (
          <CheckCircle2 className="size-5 text-lightGreen" />
        ) : (
          <XCircle className="size-5 text-brick" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{t.title}</p>
        {t.message && <p className="mt-1 text-xs leading-relaxed text-ink/60">{t.message}</p>}
        {t.action && (
          <button
            type="button"
            onClick={() => {
              dismiss(t.id);
              t.action?.onClick();
            }}
            className="mt-2 cursor-pointer text-xs font-medium text-ink underline underline-offset-2 hover:text-ink/70"
          >
            {t.action.label}
          </button>
        )}
        {more > 0 && (
          <p className="mt-2 text-[11px] font-medium text-ink/45">
            {more} more · click to see {more === 1 ? "it" : "them all"}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(t.id)}
        aria-label="Dismiss"
        className="-mt-0.5 -mr-0.5 shrink-0 cursor-pointer p-1 text-ink/40 transition-colors hover:text-ink"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
