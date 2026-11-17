"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { button, SaveButton } from "@/components/ui";
import { useSettingsForm } from "@/components/forms";
import SaveBar from "@/components/SaveBar";
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
import { useDraftBackup, useSaveWhenOnline } from "@/lib/offline";
import { applyInlineEdit, CAREERS_NOT_INLINE, type CareersField, type FrameRect } from "@/lib/live-editor";
import type { PreviewToken } from "@/lib/preview-token";
import type { CareersPage } from "@/lib/careers";
import { saveCareersPage } from "./actions";
import CareersFields, { CareersListEditor } from "./CareersFields";

// The cards: each list, the jobs, and the form view with all of it.
type Card = CareersField | "form";
const CARDS: Record<Card, { title: string; hint?: string; panel?: boolean; size?: "lg" | "xl" }> = {
  hero: { title: "Lines under the title" },
  manifesto: { title: "The manifesto" },
  signingUp: { title: "What you're signing up for" },
  upside: { title: "The upside" },
  bottomLine: { title: "Bottom line" },
  jobs: { title: "Jobs", hint: "The open jobs, in their order, come from the Jobs page, where they're added, edited and closed." },
  form: {
    title: "Form view",
    hint: "All of the page's wording in one place, the thank-you after applying included. It's the same draft as the page beside it: Save at the top saves it.",
    panel: true,
    size: "lg",
  },
};

/* The careers page's live editor, as the home page and the waitlist form
   have theirs: the real /careers page (the website's /preview/careers) in a
   frame, drawn from this draft. Its wording is typed straight onto it; a
   click on a list opens that list's card, and the form view is a panel
   over the same draft. Nothing reaches the website until Save. */
export default function CareersLiveEditor({ initial, preview }: { initial: CareersPage; preview: PreviewToken }) {
  const router = useRouter();
  const { value: draft, setValue, saved, dirty, pending, save, reset } = useSettingsForm(initial, saveCareersPage);
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
    page: "careers",
    preview,
    draft,
    highlight: active === "form" ? null : active,
    onMessage: (message) => {
      if (message.type === "select") openCard(message.field, message.rect);
      else if (message.type === "rect") {
        // Its place, reported as the page scrolls: the same card, kept there.
        if (message.field === activeRef.current) openCard(message.field, message.rect);
      } else if (message.type === "edit")
        setValue((old) => applyInlineEdit(old, message.key, message.value, CAREERS_NOT_INLINE));
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

  // Unsaved changes kept on this device; Save waits out a lost connection.
  useDraftBackup("careers-page", draft, saved, setValue);
  const saveOnline = useSaveWhenOnline(() => save());
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
        title="Careers page"
        dirty={dirty}
        device={device}
        onDevice={(next) => {
          openCard(null);
          setDevice(next);
        }}
        formOpen={active === "form"}
        onForm={() => openCard(active === "form" ? null : "form")}
        formTitle="All of the page's wording as a form"
        save={<SaveButton dirty={dirty} pending={pending} waiting={saveOnline.waiting} label="Save" onClick={saveOnline.save} />}
      />

      <PreviewCanvas
        iframeRef={iframeRef}
        previewUrl={previewUrl}
        previewError={previewError}
        device={device}
        title="Live preview of the careers page"
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
          {active === "form" ? (
            <CareersFields page={draft} setValue={setValue} />
          ) : active === "jobs" ? (
            <button type="button" onClick={() => leave("/careers/jobs")} className={button.secondary}>
              Edit the jobs <ArrowRight className="size-4" />
            </button>
          ) : (
            <CareersListEditor page={draft} list={active} setValue={setValue} />
          )}
        </FieldCard>
      )}

      {/* The reminder at the foot of the window while anything's unsaved,
          as on every page with a Save. */}
      <SaveBar inEditor dirty={dirty} pending={pending} waiting={saveOnline.waiting} onSave={saveOnline.save} onDiscard={reset} />
    </div>
  );
}
