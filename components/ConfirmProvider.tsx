"use client";

import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import ConfirmationModal from "@/components/ConfirmationModal";

/* "Are you sure?" as a promise, for code that has to wait for the answer
   (leaving with unsaved changes, deleting a block from the page): the
   admin's own ConfirmationModal, never the browser's grey box.

     if (await confirm({ title: "Delete this block?", message: "…" })) …

   Escape or Cancel answers no. */

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  variant?: "danger" | "warning" | "confirm";
};

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [asking, setAsking] = useState<ConfirmOptions | null>(null);
  const answer = useRef<((yes: boolean) => void) | null>(null);

  const reply = useCallback((yes: boolean) => {
    answer.current?.(yes);
    answer.current = null;
    setAsking(null);
  }, []);

  const confirm = useCallback<Confirm>(
    (options) =>
      new Promise((resolve) => {
        // A second question answers the first no.
        answer.current?.(false);
        answer.current = resolve;
        setAsking(options);
      }),
    [],
  );

  useEffect(() => {
    if (!asking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Before anything underneath (a drawer, a card) hears it.
      e.stopImmediatePropagation();
      reply(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [asking, reply]);

  return (
    <ConfirmContext value={confirm}>
      {children}
      <ConfirmationModal
        isOpen={asking !== null}
        onClose={() => reply(false)}
        onConfirm={() => reply(true)}
        title={asking?.title ?? ""}
        message={asking?.message ?? ""}
        confirmText={asking?.confirmText}
        variant={asking?.variant}
      />
    </ConfirmContext>
  );
}

export function useConfirm(): Confirm {
  const ctx = use(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
