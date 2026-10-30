"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import type { Result } from "@/lib/result";

/* Toasts in the top right: every save reports here rather than beside
   its button. Successes go after 4 s, errors stay
   8 s so there's time to read them. */

type ToastItem = {
  id: string;
  variant: "success" | "error";
  title: string;
  message?: string;
};

type ToastApi = {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  // A server action's Result: green if it saved, red with its message if not.
  result: (result: Result, title?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (variant: ToastItem["variant"], title: string, message?: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, variant, title, message }]);
      setTimeout(() => dismiss(id), variant === "success" ? 4000 : 8000);
    },
    [dismiss],
  );

  const toast = useMemo<ToastApi>(
    () => ({
      success: (title, message) => add("success", title, message),
      error: (title, message) => add("error", title, message),
      result: (r, title) =>
        r.ok
          ? add("success", title ?? "Saved", r.message)
          : add("error", "Not saved", r.message),
    }),
    [add],
  );

  return (
    <ToastContext value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-6 right-6 z-200 flex flex-col items-end gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.variant === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-80 max-w-[calc(100vw-32px)] animate-toast-in items-start gap-4 rounded-xl border border-ink/10 bg-white p-4 shadow-soft"
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
              {t.message && (
                <p className="mt-1 text-xs leading-relaxed text-ink/60">{t.message}</p>
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
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
