"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { button } from "@/components/ui";
import ConfirmationModal from "@/components/ConfirmationModal";

/* The form pages' one save (the schedule, the waitlist form, the home
   page's form view): a bar floating at the foot of the window that comes up
   once something changes, with Discard (after a confirm) and Save. Nothing
   on these pages saves until it's pressed. */
export default function SaveBar({
  dirty,
  pending,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  pending: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const shown = dirty || pending;

  return (
    <>
      <div
        aria-hidden={!shown}
        inert={!shown}
        className={`pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-[opacity,translate] duration-200 md:pl-25 ${
          shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div
          role="region"
          aria-label="Unsaved changes"
          className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-ink/10 bg-white py-2.5 pr-2.5 pl-5 shadow-[0_12px_40px_-12px_rgb(26_26_24/0.35)]"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-ink">
            <span className="size-1.5 shrink-0 rounded-full bg-brick" />
            <span className="truncate">{pending ? "Saving your changes…" : "You have unsaved changes"}</span>
          </span>
          <button type="button" onClick={() => setConfirming(true)} disabled={pending} className={button.ghost}>
            Discard
          </button>
          <button type="button" onClick={onSave} disabled={pending} className={`${button.primary} py-2!`}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onDiscard();
        }}
        title="Discard your changes?"
        message="Everything you've changed on this page since it was last saved goes back to how it was."
        confirmText="Discard changes"
        variant="warning"
      />
    </>
  );
}
