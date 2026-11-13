"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { SaveButton } from "@/components/ui";
import { useSettingsForm } from "@/components/forms";
import {
  cardPosition,
  EditorHeader,
  FieldCard,
  PreviewCanvas,
  usePreviewFrame,
  type Box,
  type Device,
} from "@/components/live-editor/editorShell";
import { confirmNavigation, useLeaveGuard } from "@/lib/navigation-guard";
import { startNavigationProgress } from "@/lib/navigation-progress";
import { applyInlineEdit, WAITLIST_NOT_INLINE, type FrameRect, type WaitlistField } from "@/lib/live-editor";
import type { PreviewToken } from "@/lib/preview-token";
import type { WaitlistForm } from "@/lib/types";
import { saveWaitlistForm } from "./actions";
import WaitlistFields, { UnitTypes } from "./WaitlistFields";

// The cards: the unit types, and the form view with all of it.
type Card = WaitlistField | "form";
const CARDS: Record<Card, { title: string; hint?: string; panel?: boolean; size?: "lg" | "xl" }> = {
  unitTypes: { title: "Unit types", hint: "The choices under “Preferred unit type”, in this order." },
  form: {
    title: "Form view",
    hint: "All of the form's wording in one place. It's the same draft as the page beside it: Save at the top saves it.",
    panel: true,
    size: "lg",
  },
};

/* The waitlist form's live editor, as the home page and buildings have
   theirs: the real "Apply now" form (the website's /preview/waitlist) in a
   frame, drawn from this draft, with the thank-you card under it. Its
   wording is typed straight onto it; a click on the unit type choice opens
   that list's card, and the form view is a panel over the same draft.
   Nothing reaches the website until Save. */
export default function WaitlistLiveEditor({ initial, preview }: { initial: WaitlistForm; preview: PreviewToken }) {
  const router = useRouter();
  const { value: draft, setValue, dirty, pending, save } = useSettingsForm(initial, saveWaitlistForm);
  const [device, setDevice] = useState<Device>("desktop");
  const [active, setActive] = useState<Card | null>(null);
  const [anchor, setAnchor] = useState<FrameRect | null>(null);
  const [frameBox, setFrameBox] = useState<Box | null>(null);
  const activeRef = useRef<Card | null>(null);
  // Cards are drawn in the browser only: where one floats depends on the window.
  const inBrowser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { iframeRef, previewUrl, previewError } = usePreviewFrame({
    page: "waitlist",
    preview,
    draft,
    highlight: active === "form" ? null : active,
    onMessage: (message) => {
      if (message.type === "select") openCard(message.field, message.rect);
      else if (message.type === "rect") {
        // Its place, reported as the page scrolls: the same card, kept there.
        if (message.field === activeRef.current) openCard(message.field, message.rect);
      } else if (message.type === "edit")
        setValue((old) => applyInlineEdit(old, message.key, message.value, WAITLIST_NOT_INLINE));
    },
  });

  const openCard = useCallback(
    (card: Card | null, rect: FrameRect | null = null) => {
      setActive(card);
      setAnchor(rect);
      const box = iframeRef.current?.getBoundingClientRect();
      setFrameBox(box ? { left: box.left, top: box.top, width: box.width, height: box.height } : null);
    },
    [iframeRef],
  );

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useLeaveGuard(dirty);
  const leave = async (href: string) => {
    if (!(await confirmNavigation())) return;
    startNavigationProgress(href);
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-45 flex flex-col bg-bone">
      <EditorHeader
        back={{ label: "Dashboard", onClick: () => leave("/") }}
        title="Waitlist form"
        dirty={dirty}
        device={device}
        onDevice={(next) => {
          openCard(null);
          setDevice(next);
        }}
        formOpen={active === "form"}
        onForm={() => openCard(active === "form" ? null : "form")}
        formTitle="All of the form's wording as a form"
        save={<SaveButton dirty={dirty} pending={pending} label="Save" onClick={() => save()} />}
      />

      <PreviewCanvas
        iframeRef={iframeRef}
        previewUrl={previewUrl}
        previewError={previewError}
        device={device}
        title="Live preview of the waitlist form"
        onBackgroundClick={() => openCard(null)}
      />

      {active && inBrowser && (
        <FieldCard
          key={active}
          title={CARDS[active].title}
          hint={CARDS[active].hint}
          panel={CARDS[active].panel}
          size={CARDS[active].size}
          position={cardPosition(anchor, frameBox)}
          onClose={() => openCard(null)}
        >
          {active === "unitTypes" ? (
            <UnitTypes values={draft.unitTypes} onChange={(unitTypes) => setValue((old) => ({ ...old, unitTypes }))} />
          ) : (
            <WaitlistFields form={draft} setValue={setValue} />
          )}
        </FieldCard>
      )}
    </div>
  );
}
