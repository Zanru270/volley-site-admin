"use client";

import { useEffect, type ReactNode } from "react";
import { Loader2, Save, X } from "lucide-react";

/* The edit panel every list page opens: a rounded drawer floating in from
   the right over a dimmed page, with a fixed header and a Cancel / Save
   footer. Shared by every list page rather than repeated in each. The form inside gets `id={formId}` so the
   footer's Save button submits it. */
export default function EditModal({
  isOpen,
  onClose,
  title,
  formId,
  saveLabel = "Save",
  isSaving = false,
  wide = false,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  formId: string;
  saveLabel?: string;
  isSaving?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  // The page behind stays put while the drawer is open; Escape closes it.
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !isSaving && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex justify-end md:p-3">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/35"
        onClick={isSaving ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className={`relative flex h-full w-full animate-drawer-in flex-col overflow-hidden bg-white shadow-2xl md:rounded-2xl ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <div className="z-10 flex items-center justify-between border-b border-ink/8 bg-white px-6 py-4 md:px-7 md:py-5">
          <h2 id={`${formId}-title`} className="font-publish text-2xl text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
            className="cursor-pointer rounded-full p-2 text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-7">{children}</div>

        <div className="z-10 flex justify-end gap-2 border-t border-ink/8 bg-bone/30 px-5 py-4 md:px-7">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="cursor-pointer rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:border-ink/40 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={isSaving}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-bone transition-colors hover:bg-ink disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* A titled group inside a drawer: a hairline above, then the fields. */
export function ModalSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5 border-t border-ink/8 pt-6">
      <div>
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        {description && <p className="mt-1 text-xs text-ink/50">{description}</p>}
      </div>
      {children}
    </div>
  );
}
