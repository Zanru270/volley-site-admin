"use client";

import { AlertTriangle, Check, Loader2, X } from "lucide-react";

/* "Are you sure?" before anything that can't be undone. The same props and
   look as the Bow + Arc CMS's ConfirmationModal, plus a "confirm" variant
   (a tick and a black button) for yes-decisions like accepting someone. */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
  isLoading = false,
  variant = "danger",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  isLoading?: boolean;
  variant?: "danger" | "warning" | "confirm";
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center overflow-y-auto p-4">
      <div
        className="fixed inset-0 animate-fade-in bg-ink/60"
        onClick={isLoading ? undefined : onClose}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative mx-auto w-full max-w-md animate-pop-in overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 rounded-full p-2 ${
                variant === "confirm"
                  ? "bg-lemon/60 text-green"
                  : variant === "warning"
                    ? "bg-yellow/40 text-ink"
                    : "bg-pink/30 text-brick"
              }`}
            >
              {variant === "confirm" ? <Check className="size-6" /> : <AlertTriangle className="size-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="confirm-title" className="truncate pr-4 text-lg font-medium text-ink">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{message}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              aria-label="Close"
              className="absolute top-4 right-4 cursor-pointer p-1 text-ink/40 transition-colors hover:text-ink disabled:opacity-50 sm:static"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-ink/10 bg-bone/40 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full cursor-pointer rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-medium text-ink/60 transition-colors hover:text-ink disabled:opacity-50 sm:w-auto sm:border-transparent sm:bg-transparent sm:py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 sm:w-auto sm:py-2 ${
              variant === "danger" ? "bg-brick hover:bg-red" : "bg-black hover:bg-ink"
            }`}
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
